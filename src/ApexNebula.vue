<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
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

import { Dna, Dice6, Trophy, Crown, Zap } from 'lucide-vue-next';

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

const machineLocalPlayer = computed(() => {
  return (
    state.value.context.players.find(
      (p: Player) =>
        (p.publicKey && localPlayerInfo.value?.publicKey && p.publicKey === localPlayerInfo.value.publicKey) ||
        p.name === localPlayerInfo.value?.name
    ) || localPlayerInfo.value
  );
});

const localPlayer = computed(() => machineLocalPlayer.value);
const localGenome = computed(() => state.value.context.genomes.find((g: any) => g.playerId === localPlayer.value?.id));
const activePlayerId = computed(() => state.value.context.turnOrder[state.value.context.currentPlayerIndex]);
const currentPlayer = computed(() => {
  if (!activePlayerId.value) return null;
  return state.value.context.players.find((p: Player) => p.id === activePlayerId.value);
});
const isLocalPlayerTurn = computed(() => localPlayer.value && activePlayerId.value === localPlayer.value.id);
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

onMounted(() => {
  props.connections.forEach((conn) => {
    conn.addMessageListener(handleMessage);
  });
});

onUnmounted(() => {
  props.connections.forEach((conn) => {
    conn.removeMessageListener(handleMessage);
  });
});

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
    <div v-if="state.matches('won')" class="fixed inset-0 z-[60] flex items-center justify-center bg-[#020617]/90 backdrop-blur-3xl p-4 animate-in fade-in duration-500">
      <div class="bg-slate-900 border-purple-500/50 p-12 rounded-[3rem] max-w-2xl w-full shadow-[0_0_100px_rgba(168,85,247,0.1)] ring-1 ring-purple-500/20 text-center relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
        <div class="mx-auto w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mb-8 border border-purple-500/20 shadow-inner">
          <Trophy class="w-12 h-12 text-purple-500 animate-pulse" />
        </div>
        <h2 class="text-5xl font-black text-white mb-4 tracking-tighter">SINGULARITY ACHIEVED</h2>
        <p class="text-slate-400 text-lg mb-10 font-bold leading-relaxed max-w-md mx-auto">
          {{ winnerNames.join(', ') }} reached technological singularity through optimal evolution!
        </p>
        <div class="flex gap-4">
          <button
            @click="handleAction('RESET', {})"
            class="flex-1 h-16 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all"
          >
            New Evolution Cycle
          </button>
          <button
            @click="onFinishGame"
            class="flex-1 h-16 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-sm uppercase tracking-[0.2em] border border-white/5 transition-all"
          >
            Exit to Lobby
          </button>
        </div>
      </div>
    </div>

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
            <div class="bg-white/5 rounded-[2rem] p-6 border border-white/5 backdrop-blur-xl shadow-inner group transition-all hover:bg-white/[0.07]">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-sm font-black uppercase tracking-[0.1em] text-white">
                  {{ isLocalPlayerTurn ? 'Awaiting Input' : (currentPlayer ? `${currentPlayer.name}'s Cycle` : 'Initialization Cycle') }}
                </h3>
                <div class="text-[10px] font-black text-purple-400 uppercase tracking-widest px-3 py-1 bg-purple-500/10 rounded-full ring-1 ring-purple-500/30">
                  {{ state.context.gamePhase }}
                </div>
              </div>

              <div class="space-y-4">
                <div v-if="state.matches('setupPhase')" class="space-y-4">
                  <p class="text-[10px] text-slate-400 leading-relaxed italic">
                    Distribute 12 cubes to initialize your configuration.
                  </p>
                  <button
                    @click="handleAction('CONFIRM_PHASE', { playerId: localPlayer?.id })"
                    :disabled="!localGenome || localGenome.cubePool > 0 || state.context.confirmedPlayers.includes(localPlayer?.id || '')"
                    class="w-full uppercase font-black tracking-widest text-[10px] h-10 rounded-xl transition-all"
                    :class="[
                      state.context.confirmedPlayers.includes(localPlayer?.id || '')
                        ? 'bg-slate-800 text-slate-500'
                        : localGenome?.cubePool === 0
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                        : 'bg-indigo-900/40 text-indigo-400/50 cursor-not-allowed border border-indigo-500/20'
                    ]"
                  >
                    {{ state.context.confirmedPlayers.includes(localPlayer?.id || '') ? 'Confirmed' : localGenome?.cubePool === 0 ? 'Confirm Setup' : `${localGenome?.cubePool} Cubes Remaining` }}
                  </button>
                </div>

                <div v-if="state.matches('mutationPhase')" class="space-y-4">
                  <h5 class="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap class="w-3 h-3" />
                    Mutation Sync
                  </h5>
                  <div v-if="Object.keys(state.context.mutationResults).length < state.context.players.length" class="space-y-2">
                    <p class="text-[10px] text-slate-400 italic">
                      Systems entering radiation zone. {{ state.context.turnOrder[state.context.currentPlayerIndex] === localPlayer?.id ? 'Initiate sequence.' : 'Awaiting turn...' }}
                    </p>
                    <button
                      @click="handleAction('INITIATE_MUTATION', {})"
                      :disabled="state.context.turnOrder[state.context.currentPlayerIndex] !== localPlayer?.id"
                      class="w-full h-10 uppercase font-black tracking-widest text-[10px] rounded-xl transition-all flex items-center justify-center gap-2"
                      :class="[
                        state.context.turnOrder[state.context.currentPlayerIndex] === localPlayer?.id
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      ]"
                    >
                      <Dice6 class="w-4 h-4" />
                      {{ state.context.turnOrder[state.context.currentPlayerIndex] === localPlayer?.id ? 'Initiate' : 'Awaiting...' }}
                    </button>
                  </div>
                  <div v-else class="space-y-4">
                    <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
                      <template v-for="p in state.context.players" :key="p.id">
                        <div v-if="state.context.mutationResults[p.id]" class="bg-slate-900/50 p-2 rounded-lg border border-white/5 space-y-1">
                          <div class="flex justify-between items-center">
                            <span class="text-[8px] font-bold text-slate-400 uppercase">{{ p.name }}</span>
                            <div class="flex gap-1">
                              <div class="px-1 bg-indigo-500/20 rounded text-[8px] font-black text-indigo-400">
                                {{ state.context.mutationResults[p.id].attrRoll }}
                              </div>
                              <div class="px-1 bg-purple-500/20 rounded text-[8px] font-black text-purple-400" title="Current Roll">
                                {{ state.context.mutationResults[p.id].magnitude > 0 ? '+' : '' }}{{ state.context.mutationResults[p.id].magnitude }}
                              </div>
                              <div v-if="state.context.genomes.find(g => g.playerId === p.id)" class="px-1 bg-emerald-500/20 rounded text-[8px] font-black text-emerald-400" title="Total Modifier">
                                Σ {{ (state.context.genomes.find(g => g.playerId === p.id)?.mutationModifiers?.[state.context.mutationResults[p.id].attr] ?? 0) > 0 ? '+' : '' }}{{ state.context.genomes.find(g => g.playerId === p.id)?.mutationModifiers?.[state.context.mutationResults[p.id].attr] ?? 0 }}
                              </div>
                            </div>
                          </div>
                          <div class="text-[9px] font-black uppercase tracking-tight text-white/70">
                            {{ state.context.mutationResults[p.id].attr }}: {{ state.context.mutationResults[p.id].magnitude >= 0 ? '+' : '' }}{{ state.context.mutationResults[p.id].magnitude }}
                          </div>
                        </div>
                      </template>
                    </div>
                    <button
                      @click="handleAction('CONFIRM_PHASE', { playerId: localPlayer?.id })"
                      :disabled="state.context.confirmedPlayers.includes(localPlayer?.id || '')"
                      class="w-full uppercase font-black tracking-widest text-[10px] h-10 rounded-xl transition-all"
                      :class="[
                        state.context.confirmedPlayers.includes(localPlayer?.id || '')
                          ? 'bg-slate-800 text-slate-500'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                      ]"
                    >
                      {{ state.context.confirmedPlayers.includes(localPlayer?.id || '') ? 'Confirmed' : 'Confirm Phase' }}
                    </button>
                  </div>
                </div>

                <div v-if="state.matches('phenotypePhase')" class="space-y-4">
                  <div v-if="isLocalPlayerTurn" class="space-y-3">
                    <div class="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                      <p class="text-[10px] font-black text-indigo-400 uppercase">Movement Active</p>
                      <p class="text-xs font-black text-white">
                        {{ Math.max(0, (localGenome?.baseAttributes.NAV || 0) + (localGenome?.mutationModifiers.NAV || 0) + (localGenome?.tempAttributeModifiers.NAV || 0) - (state.context.phenotypeActions[localPlayer?.id!]?.movesMade || 0)) }} Units
                      </p>
                    </div>
                    <button
                      @click="handleFinishTurn"
                      class="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest border border-white/10"
                    >
                      Finalize Turn
                    </button>
                  </div>
                  <div v-else class="p-4 bg-slate-900/50 rounded-xl border border-white/5 text-center italic text-slate-500 text-[10px] uppercase">
                    Awaiting Turn...
                  </div>
                </div>

                <div v-if="state.matches('phenotypePhase') && state.context.lastHarvestResults.length > 0" class="space-y-3">
                  <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <div class="w-1 h-3 bg-cyan-500 rounded-full" />
                    Latest Extractions
                  </div>
                  <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
                    <div v-for="(res, i) in state.context.lastHarvestResults" :key="i" class="p-2 rounded-lg border flex items-center justify-between font-black text-[9px] uppercase tracking-tight" :class="res.success ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-red-500/10 border-red-500/20 text-red-400'">
                      <span class="truncate max-w-[70px]">{{ state.context.players.find(pl => pl.id === res.playerId)?.name || 'Unknown' }}</span>
                      <div class="flex items-center gap-2">
                        <span class="opacity-70">{{ res.attribute }}</span>
                        <div class="flex items-center gap-1">
                          <Dice6 class="w-3 h-3 opacity-50" />
                          <span>{{ res.roll }}</span>
                          <span class="text-[7px] px-1 rounded" :class="res.success ? 'bg-cyan-500/20' : 'bg-red-500/20'">
                            {{ res.success ? 'SUCCESS' : 'FAILURE' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="state.matches('environmentalPhase')" class="space-y-4">
                  <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
                    <template v-for="(res, pid) in state.context.lastEventResults" :key="pid">
                      <div class="p-2 rounded-lg border flex items-center justify-between font-black text-[9px] uppercase tracking-tight" :class="res.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'">
                        <span class="truncate max-w-[80px]">{{ state.context.players.find(pl => pl.id === pid)?.name }}</span>
                        <div class="flex items-center gap-1.5">
                          <Dice6 class="w-3 h-3 opacity-50" />
                          <span>{{ res.roll }}</span>
                          <span class="opacity-50 text-[7px]">({{ res.modifier >= 0 ? '+' : '' }}{{ res.modifier }})</span>
                        </div>
                      </div>
                    </template>
                  </div>
                  <button
                    v-if="isInitiator"
                    @click="handleAction('NEXT_PHASE', {})"
                    class="w-full h-10 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/10"
                  >
                    Resolve Event Protocol
                  </button>
                </div>

                <button
                  v-if="state.matches('competitivePhase') && isInitiator"
                  @click="handleAction('NEXT_PHASE', {})"
                  class="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-[0.2em]"
                >
                  Resolve Competitive
                </button>

                <div v-if="state.matches('optimizationPhase')" class="space-y-4">
                  <div class="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
                    <div class="flex justify-between items-center">
                      <span class="text-[10px] font-black text-indigo-400 uppercase">Data Optimization</span>
                      <span class="text-[10px] font-black text-white">{{ localGenome?.dataClusters || 0 }}/3</span>
                    </div>
                    <button
                      @click="handleAction('OPTIMIZE_DATA', { playerId: localPlayer?.id })"
                      :disabled="!localGenome || localGenome.dataClusters < 3 || state.context.confirmedPlayers.includes(localPlayer?.id || '')"
                      class="w-full h-8 bg-indigo-600 hover:bg-indigo-500 text-[9px] uppercase font-black tracking-widest rounded-lg flex items-center justify-center"
                    >
                      <Zap class="w-3 h-3 mr-2" />
                      Gain Attribute Cube
                    </button>
                  </div>

                  <div class="p-3 bg-slate-900/50 border border-white/5 rounded-xl space-y-3">
                    <span class="text-[10px] font-black text-slate-400 uppercase">Attribute Pruning</span>
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        v-for="attr in (['NAV', 'LOG', 'DEF', 'SCN'] as AttributeType[])"
                        :key="attr"
                        @click="handleAction('PRUNE_ATTRIBUTE', { playerId: localPlayer?.id, attribute: attr })"
                        :disabled="!localGenome || localGenome.baseAttributes[attr] <= 1 || state.context.confirmedPlayers.includes(localPlayer?.id || '')"
                        class="h-8 text-[8px] font-black uppercase border-white/5 bg-black/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all rounded-md border"
                      >
                        Prune {{ attr }}
                      </button>
                    </div>
                    <p class="text-[7px] text-slate-500 italic text-center uppercase tracking-tight">+2 Matter per pruned level</p>
                  </div>

                  <div class="pt-2">
                    <button
                      @click="handleAction('CONFIRM_PHASE', { playerId: localPlayer?.id })"
                      :disabled="state.context.confirmedPlayers.includes(localPlayer?.id || '')"
                      class="w-full h-12 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
                      :class="[
                        state.context.confirmedPlayers.includes(localPlayer?.id || '')
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : (localGenome?.rawMatter || 0) >= calculateMaintenanceCost(localGenome!)
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : 'bg-red-900/40 text-red-400 border border-red-500/20'
                      ]"
                    >
                      <template v-if="localGenome">
                        {{ state.context.confirmedPlayers.includes(localPlayer?.id || '')
                          ? 'Maint Sequence Active'
                          : localGenome.rawMatter >= calculateMaintenanceCost(localGenome)
                          ? `Finalize (Pay ${calculateMaintenanceCost(localGenome)} Matter)`
                          : 'Insufficient Matter'
                        }}
                      </template>
                    </button>
                    <p class="text-[7px] text-slate-500 text-center mt-2 uppercase opacity-50">
                      Resets Stability to 3 | Caps Data/Matter at 2
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
