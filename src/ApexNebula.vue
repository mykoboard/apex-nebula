<script setup lang="ts">
import { computed, watch } from 'vue';
import { useMachine } from '@xstate/vue';
import { createGameMessage, isGameMessage } from '@mykoboard/integration';
import type { GameProps } from '@mykoboard/integration';
import { apexNebulaMachine } from './apexNebulaMachine';
import type { Color, Player, AttributeType } from './types';
import { calculateMaintenanceCost } from './utils';

import HexGrid from './components/HexGrid.vue';
import PlayerConsole from './components/PlayerConsole.vue';
import EventCard from './components/EventCard.vue';
import EventDeck from './components/EventDeck.vue';
import PhaseIndicator from './components/PhaseIndicator.vue';
import CommandProtocol from './components/CommandProtocol.vue';
import SingularityWonScreen from './components/SingularityWonScreen.vue';

import { Dna, Dice6, Zap, Crown } from 'lucide-vue-next';

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
    id: info.id,
    name: info.name,
    publicKey: info.publicKey,
    color: COLORS[index % COLORS.length],
  }));
});

const { snapshot, send } = useMachine(apexNebulaMachine, {
  input: {
    players: players.value,
    genomes: players.value.map((p) => ({
      playerId: p.id,
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
        playerId: p.id,
        hexId: starts[i % starts.length],
      };
    }),
    isInitiator: props.isInitiator,
    ledger: props.ledger,
    readyPlayers: [],
  },
});

const state = snapshot;

const localPlayerInfo = computed(() => props.playerInfos.find((p) => p.isLocal));

const machineLocalPlayer = computed<Player | null>(() => {
  return (
    state.value.context.players.find(
      (p: Player) =>
        (p.publicKey && localPlayerInfo.value?.publicKey && p.publicKey === localPlayerInfo.value.publicKey) ||
        p.id === localPlayerInfo.value?.id
    ) || null
  );
});

const localPlayer = computed(() => machineLocalPlayer.value);
const localGenome = computed(() => state.value.context.genomes.find((g: any) => g.playerId === localPlayer.value?.id));
const activePlayerId = computed(() => state.value.context.turnOrder[state.value.context.currentPlayerIndex]);
const currentPlayer = computed(() => {
  if (!activePlayerId.value) return null;
  return state.value.context.players.find((p: Player) => p.id === activePlayerId.value);
});
const isLocalPlayerTurn = computed(() => !!(localPlayer.value && activePlayerId.value === localPlayer.value.id));
const otherPlayers = computed(() => state.value.context.players.filter((p: Player) => p.id !== localPlayer.value?.id));

// WebRTC message handling
const handleMessage = (data: string) => {
  try {
    const message = JSON.parse(data);
    if (isGameMessage(message)) {
      send({ type: message.type as any, ...message.payload });

      // If Host receives an action from a Guest, it should persist it to the ledger (except state syncs)
      if (props.isInitiator && message.type !== 'SYNC_STATE') {
        props.onAddLedger({ type: message.type, payload: message.payload });
      }
    }
  } catch (error) {
    console.error('Failed to parse message:', error);
  }
};

watch(
  () => props.connections,
  (conns, _, onCleanup) => {
    conns.forEach((conn) => {
      conn.addMessageListener(handleMessage);
    });
    onCleanup(() => {
      conns.forEach((conn) => {
        conn.removeMessageListener(handleMessage);
      });
    });
  },
  { immediate: true }
);

// Start game for host once players are ready
watch(
  () => [props.isInitiator, state.value.matches('waitingForPlayers'), players.value.length] as const,
  ([isInitiator, isWaiting, playerLen]: readonly [boolean, boolean, number]) => {
    if (isInitiator && isWaiting && playerLen > 0) {
      console.log('[ApexNebula] Auto-triggering START_GAME with', playerLen, 'players');
      send({
        type: 'START_GAME',
        seed: state.value.context.seed || Date.now(),
        players: players.value,
      });
    }
  },
  { immediate: true }
);

// Sync state changes to other players
watch(
  () => state.value.context,
  (context) => {
    if (props.isInitiator && context.players.length > 0) {
      const message = createGameMessage('SYNC_STATE', { context });
      props.connections.forEach((conn) => {
        conn.send(JSON.stringify(message));
      });
    }
  },
  { deep: true }
);

const handleAction = (actionType: string, payload: any) => {
  if (props.isInitiator) {
    send({ type: actionType as any, ...payload });

    if (state.value.matches('setupPhase') && actionType === 'DISTRIBUTE_CUBES') {
      const { playerId, amount } = payload;
      props.onAddLedger({ type: actionType, payload: { playerId, amount } });
      return;
    }

    props.onAddLedger({ type: actionType, payload });
  } else {
    // Guest sends WebRTC message to Host instead of trying to add to ledger
    const message = createGameMessage(actionType, payload);
    props.connections.forEach((conn) => conn.send(JSON.stringify(message)));

    // Optimistically dispatch locally so UI updates instantly
    send({ type: actionType as any, ...payload });
  }
};

const handleFinishTurn = () => {
  if (!localPlayer.value) return;
  handleAction('FINISH_TURN', { playerId: localPlayer.value.id });
};

const winnerNames = computed(() => {
  if (!state.value.matches('won')) return [];
  return state.value.context.winners
    .map((id: string) => state.value.context.players.find((p: Player) => p.id === id)?.name)
    .filter(Boolean);
});

const hexGridEntries = computed(() => {
    return Object.fromEntries(
        state.value.context.players.map((p: Player) => [p.id, COLORS_HEX[p.color]])
    );
});

const currentLocalHexId = computed(() => state.value.context.pieces.find(p => p.playerId === localPlayer.value?.id)?.hexId);

const localMaxDistance = computed(() => {
    if (!isLocalPlayerTurn.value) return 0;
    const nav = (localGenome.value?.baseAttributes.NAV || 0) + 
                (localGenome.value?.mutationModifiers.NAV || 0) + 
                (localGenome.value?.tempAttributeModifiers.NAV || 0);
    const movesMade = state.value.context.phenotypeActions[localPlayer.value?.id!]?.movesMade || 0;
    return nav > movesMade ? 1 : 0;
});
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
          <div v-for="p in otherPlayers" :key="p.id" class="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full" :title="p.name">
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
            @hex-click="(hexId) => isLocalPlayerTurn && handleAction('MOVE_PLAYER', { playerId: localPlayer?.id, hexId })"
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
              :local-genome="localGenome"
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
              <Crown v-if="state.context.priorityPlayerId === localPlayer?.id" class="w-3 h-3 text-yellow-500" />
            </h4>
            <PlayerConsole
              v-if="localGenome"
              :genome="localGenome"
              :editable="state.matches('setupPhase') || localGenome.cubePool > 0 || state.matches('optimizationPhase')"
              :setup-limit="state.matches('setupPhase') ? 6 : undefined"
              @distribute="(attr, amt) => {
                if (amt < 0 && state.matches('optimizationPhase')) {
                  handleAction('PRUNE_ATTRIBUTE', { playerId: localPlayer?.id, attribute: attr });
                } else {
                  handleAction('DISTRIBUTE_CUBES', { playerId: localPlayer?.id, attribute: attr, amount: amt });
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
          <template v-for="genome in state.context.genomes" :key="genome.playerId">
            <div v-if="genome.playerId !== localPlayer?.id" class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="text-[10px] font-bold text-slate-500 uppercase">{{ state.context.players.find(p => p.id === genome.playerId)?.name }}</div>
                  <Crown v-if="state.context.priorityPlayerId === genome.playerId" class="w-3 h-3 text-yellow-500" />
                </div>
                <div v-if="state.matches('setupPhase')" class="px-2 py-0.5 border rounded text-[8px] font-black uppercase" :class="state.context.confirmedPlayers.includes(genome.playerId) ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-800 border-white/5 text-slate-500'">
                  {{ state.context.confirmedPlayers.includes(genome.playerId) ? 'Ready' : 'Configuring' }}
                </div>
                <div v-else-if="state.matches('phenotypePhase') ? state.context.turnOrder.indexOf(genome.playerId) < state.context.currentPlayerIndex : genome.cubePool === 0" class="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-[8px] font-black text-green-400 uppercase">
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
