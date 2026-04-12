<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import './index.css';
import { useMachine } from '@xstate/vue';
import { createGameMessage, isGameMessage } from '@mykoboard/integration';
import type { GameProps } from '@mykoboard/integration';
import { apexNebulaMachine } from './apexNebulaMachine';
import type { Color, Player} from './types';

import HexGrid from './components/HexGrid.vue';
import PlayerConsole from './components/PlayerConsole.vue';
import EventCard from './components/EventCard.vue';
import EventDeck from './components/EventDeck.vue';
import PhaseIndicator from './components/PhaseIndicator.vue';
import CommandProtocol from './components/CommandProtocol.vue';
import SingularityWonScreen from './components/SingularityWonScreen.vue';

import { Dna, Crown } from 'lucide-vue-next';

const props = defineProps<GameProps>();

const COLORS: Color[] = ['red', 'green', 'blue', 'yellow'];

const COLORS_HEX: Record<Color, string> = {
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#facc15',
};

const players = computed<Player[]>(() => {
  return props.playerInfos.map((info, index) => ({
    name: info.name,
    publicKey: info.publicKey,
    color: COLORS[index % COLORS.length],
  }));
});

// Resolve local player public key reactively — this becomes the machine's source of truth
const resolvedLocalPublicKey = computed(() => {
  const local = props.playerInfos.find((p) => p.isLocal);
  return local?.publicKey || '';
});

const { snapshot, send } = useMachine(apexNebulaMachine, {
  input: {
    localPublicKey: resolvedLocalPublicKey.value,
    players: players.value,
    genomes: players.value.map((p) => ({
      playerPublicKey: p.publicKey,
      stability: 3,
      dataClusters: 0,
      rawMatter: 0,
      insightTokens: 0,
      lockedSlots: [],
      baseAttributes: { NAV: 1, LOG: 1, DEF: 1, SCN: 1 },
      mutationModifiers: { NAV: 0, LOG: 0, DEF: 0, SCN: 0 },
      tempAttributeModifiers: { NAV: 0, LOG: 0, DEF: 0, SCN: 0 },
      cubePool: 8,
    })),
    pieces: players.value.map((p, i) => {
      const starts = ['H-4--2', 'H--2-4', 'H--4-2', 'H-2--4'];
      return {
        playerPublicKey: p.publicKey,
        hexId: starts[i % starts.length],
      };
    }),
    isInitiator: props.isInitiator,
    ledger: props.ledger,
    readyPlayers: [],
  },
});

const state = snapshot;

// Derive local player directly from the machine's authoritative localPublicKey
// Fallback to resolvedLocalPublicKey if the machine hasn't synced yet
const localPlayer = computed<Player | null>(() => {
  // Primary: machine's authoritative context
  const mcKey = state.value.context.localPublicKey;
  if (mcKey) {
    const p = state.value.context.players.find((p: Player) => p.publicKey === mcKey);
    if (p) return p;
  }
  
  // Secondary: resolved from props if machine hasn't synced yet
  const propKey = resolvedLocalPublicKey.value;
  if (propKey) {
    const p = state.value.context.players.find((p: Player) => p.publicKey === propKey);
    if (p) return p;
  }

  return null;
});

const localGenome = computed(() => {
  if (!localPlayer.value) return null;
  return state.value.context.genomes.find((g: any) => g.playerPublicKey === localPlayer.value.publicKey) || null;
});
const activePlayerPublicKey = computed(() => state.value.context.turnOrder[state.value.context.currentPlayerIndex]);
const currentPlayer = computed(() => state.value.context.players.find((p: Player) => p.publicKey === activePlayerPublicKey.value));
const isLocalPlayerTurn = computed(() => !!(localPlayer.value && activePlayerPublicKey.value === localPlayer.value.publicKey));

// Phase helpers for template and logic parity
const isWaiting = computed(() => state.value.matches('waitingForPlayers'));
const isSetup = computed(() => state.value.matches('setupPhase'));
const isOptimization = computed(() => state.value.matches('optimizationPhase'));

const otherPlayers = computed(() => state.value.context.players.filter((p: Player) => p.publicKey !== localPlayer.value?.publicKey));

// WebRTC message handling — apply received peer events to local machine
const handleMessage = (data: any) => {
  try {
    const rawMessage = typeof data === 'string' ? JSON.parse(data) : data;
    console.log('[ApexNebula] Processing message:', rawMessage.type, rawMessage);
    
    // Broaden filters to catch system-level game messages
    const isValid = isGameMessage(rawMessage) || rawMessage.namespace === 'game' || rawMessage.namespace === 'apex-nebula';

    if (isValid) {
      console.log(`[ApexNebula] Dispatched: ${rawMessage.type}`);
      send({ type: rawMessage.type as any, ...rawMessage.payload });

      // Host specific handlers
      if (props.isInitiator) {
        // Record all peer actions to the ledger
        props.onAddLedger({ type: rawMessage.type, payload: rawMessage.payload });

        // Handle sync requests from late-joining or race-condition-hit guests
        if (rawMessage.type === 'SYNC_REQUEST') {
          console.log('[ApexNebula] Received SYNC_REQUEST, re-broadcasting state...');
          broadcastCurrentState();
        }
      }
    }
  } catch (error) {
    console.error('[ApexNebula] Failed to process message:', error);
  }
};

const broadcastCurrentState = () => {
  // If we've already started, resend the START_GAME payload
  if (state.value.matches('setupPhase')) {
    const startPayload = {
      seed: state.value.context.seed || Date.now(),
      players: players.value,
    };
    const message = createGameMessage('START_GAME', startPayload);
    props.connections.forEach((conn) => {
      console.log('[ApexNebula] Re-sending START_GAME to guest');
      conn.send(JSON.stringify(message));
    });
  }
};




watch(
  () => props.connections,
  (conns, _, onCleanup) => {
    console.log(`[ApexNebula] Connections watch triggered. Count: ${conns.length}`);
    conns.forEach((conn) => {
      console.log(`[ApexNebula] Attaching listener to connection: ${conn.id || 'unknown'}`);
      conn.addMessageListener(handleMessage);
    });

    // If we're a guest and just established a connection, request sync
    if (!props.isInitiator && conns.length > 0) {
      console.log('[ApexNebula] Guest sending SYNC_REQUEST to all connections');
      conns.forEach((conn) => {
        conn.send(JSON.stringify({ namespace: 'game', type: 'SYNC_REQUEST', payload: {} }));
      });
    }

    onCleanup(() => {
      conns.forEach((conn) => {
        conn.removeMessageListener(handleMessage);
      });
    });
  },
  { immediate: true, deep: true }
);




const processedLedgerCount = ref(0);

// Replay ledger on mount and handle updates to synchronize state machine
watch(
  () => (props.ledger ? [...props.ledger] : []),
  (ledger) => {
    console.log(`[ApexNebula] Ledger watch triggered. Total items: ${ledger.length}. Processed so far: ${processedLedgerCount.value}`);
    if (!props.isInitiator && isWaiting.value && ledger && ledger.length > processedLedgerCount.value) {
      const newActions = ledger.slice(processedLedgerCount.value);
      console.log(`[ApexNebula] REPLAYING LEDGER: Found ${newActions.length} new actions to apply.`);
      newActions.forEach((action: any) => {
        console.log(`[ApexNebula] Replaying: ${action.type}`);
        send({ type: action.type as any, ...action.payload });
      });
      processedLedgerCount.value = ledger.length;
    }
  },
  { immediate: true }
);


const confirmedLocal = computed(() => state.value.context.confirmedPlayers.includes(localPlayer.value?.publicKey || ''));



// Start game for host once players are ready — broadcast so guest initializes identically
watch(
  () => [props.isInitiator, state.value.matches('waitingForPlayers'), players.value.length] as const,
  ([isInitiator, isWaiting, playerLen]: readonly [boolean, boolean, number]) => {
    // Only auto-start if there are at least 2 players joining
    if (isInitiator && isWaiting && playerLen >= 2) {
      console.log('[ApexNebula] Auto-triggering START_GAME with', playerLen, 'players (Delayed for guest handshake)');
      
      // Delay to give guest time to mount and attach listeners
      setTimeout(() => {
        const seed = state.value.context.seed || Date.now();
        const startPayload = { seed, players: players.value };

        // 1. Process locally
        send({ type: 'START_GAME', ...startPayload });

        // 2. Broadcast so the guest machine transitions identically
        const message = createGameMessage('START_GAME', startPayload);
        props.connections.forEach((conn) => {
          console.log('[ApexNebula] Broadcasting START_GAME to connection');
          conn.send(JSON.stringify(message));
        });

        // 3. Record to ledger (CRITICAL for late joiners)
        props.onAddLedger({ type: 'START_GAME', payload: startPayload });
      }, 800);
    }
  },
  { immediate: true }
);

 
// Sync local player public key to machine if it resolves after initialization
watch(
  resolvedLocalPublicKey,
  (newKey) => {
    if (newKey) {
      console.log('[ApexNebula] Syncing local player public key to machine:', newKey);
      send({ type: 'SET_LOCAL_PLAYER', publicKey: newKey });
    }
  },
  { immediate: true }
);

// Replicated event dispatch — process locally AND broadcast to peers.
// No host/guest distinction: every peer runs the same machine logic.
const handleAction = (actionType: string, payload: any) => {
  // Ownership gate: if the action carries a playerPublicKey, it must match localPublicKey.
  // Events without playerPublicKey (NEXT_PHASE, INITIATE_MUTATION, etc.) pass through.
  const lpKey = state.value.context.localPublicKey || resolvedLocalPublicKey.value;
  if (payload?.playerPublicKey && lpKey && payload.playerPublicKey !== lpKey) {
    console.warn(`[handleAction] Blocked ${actionType}: payload.playerPublicKey=${payload.playerPublicKey} !== localPublicKey=${lpKey}`);
    return;
  }

  // If confirming phase, batch up any pending cube distributions first
  if (actionType === 'CONFIRM_PHASE' && payload.playerPublicKey === lpKey) {
    if (pendingGenome.value && localGenome.value) {
      const distributions = [];
      const attrs = ['NAV', 'LOG', 'DEF', 'SCN'] as const;
      
      for (const attr of attrs) {
        const delta = (pendingGenome.value.baseAttributes[attr] || 0) - (localGenome.value.baseAttributes[attr] || 0);
        if (delta !== 0) {
          distributions.push({ attribute: attr, amount: delta });
        }
      }

      if (distributions.length > 0) {
        const distributePayload = { playerPublicKey: lpKey, distributions };
        
        // Process batch locally
        send({ type: 'DISTRIBUTE_CUBES', ...distributePayload });

        // Broadcast to peers
        const msg = createGameMessage('DISTRIBUTE_CUBES', distributePayload);
        props.connections.forEach((conn) => conn.send(JSON.stringify(msg)));

        // Record to ledger (host only)
        if (props.isInitiator) {
          props.onAddLedger({ type: 'DISTRIBUTE_CUBES', payload: distributePayload });
        }
      }
    }
  }

  // 1. Process locally
  send({ type: actionType as any, ...payload });

  // 2. Broadcast to all peers
  const message = createGameMessage(actionType, payload);
  props.connections.forEach((conn) => conn.send(JSON.stringify(message)));

  // 3. Record to ledger (host only)
  if (props.isInitiator) {
    props.onAddLedger({ type: actionType, payload });
  }
};


const handleFinishTurn = () => {
  if (!localPlayer.value) return;
  handleAction('FINISH_TURN', { playerPublicKey: localPlayer.value.publicKey });
};

const winnerNames = computed(() => {
  if (!state.value.matches('won')) return [];
  return state.value.context.winners
    .map((publicKey: string) => state.value.context.players.find((p: Player) => p.publicKey === publicKey)?.name)
    .filter(Boolean);
});

const hexGridEntries = computed(() => {
    return Object.fromEntries(
        state.value.context.players.map((p: Player) => [p.publicKey, COLORS_HEX[p.color]])
    );
});

const currentLocalHexId = computed(() => state.value.context.pieces.find(p => p.playerPublicKey === localPlayer.value?.publicKey)?.hexId);

const localMaxDistance = computed(() => {
    if (!isLocalPlayerTurn.value) return 0;
    const nav = (localGenome.value?.baseAttributes.NAV || 0) + 
                (localGenome.value?.mutationModifiers.NAV || 0) + 
                (localGenome.value?.tempAttributeModifiers.NAV || 0);
    const movesMade = state.value.context.phenotypeActions[localPlayer.value?.publicKey!]?.movesMade || 0;
    return nav > movesMade ? 1 : 0;
});

// Local state for pending cube distributions (unconfirmed)
const pendingGenome = ref<any>(null);

// Reset pending genome when phase changes to setup/optimization or when localGenome becomes available
watch(
  () => [state.value.context.gamePhase, localGenome.value] as const,
  ([phase, genome], [prevPhase] = []) => {
    // Reset pending genome to current machine state if not already set
    // This allows us to start from the authoritative state
    if (!pendingGenome.value && genome) {
      pendingGenome.value = JSON.parse(JSON.stringify(genome));
    }

    // Sync on phase transition to ensure we start from the machine's truth
    if (phase !== prevPhase) {
      pendingGenome.value = JSON.parse(JSON.stringify(genome));
    }
  },
  { immediate: true }
);

</script>

<template>
  <div class="min-h-screen p-8 flex flex-col space-y-12 bg-[#020617] text-slate-100 border-0 rounded-none overflow-x-hidden relative">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent)] pointer-events-none" />

    <!-- Won Screen -->
    <SingularityWonScreen
      v-if="state.matches('won')"
      :winner-names="winnerNames"
      @action="handleAction"
      @exit="onFinishGame"
    />

    <template v-else>
      <div class="flex justify-between items-center relative z-10">
        <div class="flex flex-col">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
              <Dna class="w-8 h-8 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h2 class="text-5xl font-black tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
                APEX NEBULA
              </h2>
              <p class="text-[10px] font-black text-purple-400/60 uppercase tracking-[0.4em] mt-1 ml-1">Evolutionary Strategy Protocol</p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div v-for="p in otherPlayers" :key="p.publicKey" class="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full" :title="p.name">
            <div class="w-2 h-2 rounded-full bg-purple-500" />
            <span class="text-[8px] font-black text-slate-400 uppercase">{{ p.name }}</span>
          </div>
        </div>
      </div>

      <div class="relative z-10">
        <PhaseIndicator :current-phase="state.context.gamePhase" :round="state.context.round" />
      </div>

      <!-- Top Section: Event Protocol -->
      <div class="relative z-10 space-y-6">
        <h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
          <div class="w-1 h-3 bg-orange-500 rounded-full" />
          Event Deck & Protocol
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          <div class="md:col-span-3">
            <EventCard :event="state.context.currentEvent" />
          </div>
          <div class="md:col-span-1">
            <EventDeck :deck="state.context.eventDeck" :discard="[]" />
          </div>
        </div>
      </div>

      <!-- Main Section: Map and Local Sidebar -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        <!-- Left: Map -->
        <div class="lg:col-span-8 space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
              <div class="w-1 h-3 bg-purple-500 rounded-full" />
              Nebula Sector (Navigation Grid)
            </h3>
          </div>
          <HexGrid
            :hex-grid="state.context.hexGrid"
            :pieces="state.context.pieces"
            :player-colors="hexGridEntries"
            @hex-click="(hexId) => isLocalPlayerTurn && handleAction('MOVE_PLAYER', { playerPublicKey: localPlayer?.publicKey, hexId })"
            :current-hex-id="currentLocalHexId"
            :max-distance="localMaxDistance"
          />
        </div>

        <!-- Right: Sidebar (Command + Console) -->
        <div class="lg:col-span-4 space-y-8">
          <!-- Command Protocol -->
          <div class="space-y-4">
            <h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
              <div class="w-1 h-3 bg-white/20 rounded-full" />
              Command Protocol
            </h3>
            <CommandProtocol
              :state="state"
              :local-player="localPlayer"
              :local-genome="pendingGenome || localGenome"
              :is-initiator="isInitiator"
              :current-player="currentPlayer"
              :is-local-player-turn="isLocalPlayerTurn"
              @action="handleAction"
            />
          </div>

          <!-- Local Genome Console -->
          <div class="space-y-4">
            <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <div class="w-1 h-3 bg-indigo-500 rounded-full" />
              Local System
              <Crown v-if="state.context.priorityPublicKey === localPlayer?.publicKey" class="w-3 h-3 text-yellow-500" />
            </h4>
            <PlayerConsole
              v-if="localGenome"
              :genome="pendingGenome || localGenome"
              :editable="(isSetup || isOptimization) && !confirmedLocal"
              :setup-limit="isSetup ? 10 : undefined"
              @distribute="(attr, amt) => {
                if (amt < 0 && isOptimization) {
                  handleAction('PRUNE_ATTRIBUTE', { playerPublicKey: localPlayer?.publicKey, attribute: attr });
                } else if (pendingGenome) {
                  // Only update locally, don't trigger network action
                  const currentPool = pendingGenome.cubePool;
                  if (amt > 0 && currentPool < amt) return;
                  
                  pendingGenome.baseAttributes[attr] = (pendingGenome.baseAttributes[attr] || 0) + amt;
                  pendingGenome.cubePool -= amt;
                }
              }"
            />



          </div>
        </div>
      </div>

      <!-- Bottom Section: Other Players -->
      <div class="space-y-8 relative z-10 pt-12 border-t border-white/5">
        <h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
          <div class="w-1 h-3 bg-slate-700 rounded-full" />
          External Sectors
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <template v-for="genome in state.context.genomes" :key="genome.playerPublicKey">
            <div v-if="genome.playerPublicKey !== localPlayer?.publicKey" class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="text-[10px] font-bold text-slate-500 uppercase">{{ state.context.players.find(p => p.publicKey === genome.playerPublicKey)?.name }}</div>
                  <Crown v-if="state.context.priorityPublicKey === genome.playerPublicKey" class="w-3 h-3 text-yellow-500" />
                </div>
                <div v-if="state.matches('setupPhase')" class="px-2 py-0.5 border rounded text-[8px] font-black uppercase" :class="state.context.confirmedPlayers.includes(genome.playerPublicKey) ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-800 border-white/5 text-slate-500'">
                  {{ state.context.confirmedPlayers.includes(genome.playerPublicKey) ? 'Ready' : 'Configuring' }}
                </div>
                <div v-else-if="state.matches('phenotypePhase') ? state.context.turnOrder.indexOf(genome.playerPublicKey) < state.context.currentPlayerIndex : genome.cubePool === 0" class="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-[8px] font-black text-green-400 uppercase">
                  Ready
                </div>
              </div>
              <div v-if="state.matches('setupPhase')" class="bg-slate-900/50 rounded-2xl border border-white/5 p-6 flex flex-col items-center justify-center opacity-60 min-h-[220px]">
                <Dna class="w-8 h-8 text-slate-600 mb-2" />
                <span class="text-[10px] font-black tracking-widest text-slate-500 uppercase">Classified</span>
              </div>
              <PlayerConsole v-else :genome="genome" />
            </div>
          </template>
        </div>
      </div>

      <div class="mt-auto w-full flex justify-between items-center pt-8 border-t border-white/5 relative z-10 opacity-50">
        <div class="flex gap-4">
          <div class="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <p class="text-[8px] font-bold text-slate-700 uppercase tracking-[0.4em]">
            APEX-OS // NODE_CONNECTED
          </p>
        </div>
        <p class="text-[8px] font-bold text-slate-700 uppercase tracking-[0.4em]">
          Build 2026.02.27
        </p>
      </div>
    </template>
  </div>
</template>
