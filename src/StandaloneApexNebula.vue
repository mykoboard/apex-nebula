<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ApexNebula from './ApexNebula.vue';
import type { PlayerInfo, SimpleConnection } from '@mykoboard/integration';
import { createLocalWebRTCPair, createGameMessage } from '@mykoboard/integration';
import { INITIAL_EVENT_DECK } from './eventUtils';
import { ChevronDown } from 'lucide-vue-next';

const mockPlayers: PlayerInfo[] = [
  { id: 'player1', name: 'Alpha AI', status: 'game', isConnected: true, isLocal: true, isHost: true },
  { id: 'player2', name: 'Beta AI', status: 'game', isConnected: true, isLocal: false, isHost: false },
];

const mockConnections = ref<SimpleConnection[]>([]);
let remoteProxy: SimpleConnection | null = null;
const showEvents = ref(false);

onMounted(async () => {
  console.log('[Standalone] Initializing WebRTC pair...');
  const [connA, connB] = await createLocalWebRTCPair();
  console.log('[Standalone] WebRTC pair ready. connA ID:', connA.id);
  
  // Alpha AI uses connA to communicate with the world
  mockConnections.value = [connA];
  // We keep connB as a way to simulate incoming messages for connA
  remoteProxy = connB;

  // Add a listener to remoteProxy to see what the game is sending out
  remoteProxy.addMessageListener((data) => {
    console.log('[Standalone] Remote received from game:', JSON.parse(data));
  });
});

const handleAddLedger = (action: { type: string; payload: any }) => {
  console.log('Add to ledger:', action);
};

const handleFinishGame = () => {
  console.log('Game finished');
  alert('Game finished! In production, this would return to lobby.');
};

const sendDebugMessage = (type: string, payload: any) => {
  if (!remoteProxy) {
    console.error('[Standalone] Cannot send message: remoteProxy not initialized');
    return;
  }
  const message = createGameMessage(type, payload);
  console.log(`[Standalone] Simulating ${type} from remote:`, message);
  remoteProxy.send(JSON.stringify(message));
};

const forceEvent = (eventId: string) => {
  sendDebugMessage('FORCE_EVENT', { eventId });
  showEvents.value = false;
};

const startGame = () => {
  const seed = Math.floor(Math.random() * 1000000);
  sendDebugMessage('START_GAME', { seed });
};

const forceBetaAIDistribution = () => {
  console.log('[Standalone] Forcing Beta AI Distribution...');
  // Deterministic randomization for mock Beta AI
  const dist = [1, 1, 1, 1];
  let remaining = 8; // Reset to 8 to reach 12 total (start with 1 each)
  while (remaining > 0) {
    const idx = Math.floor(Math.random() * 4);
    if (dist[idx] < 6) {
      dist[idx]++;
      remaining--;
    }
  }
  const attrs = ['NAV', 'LOG', 'DEF', 'SCN'];
  attrs.forEach((attr, i) => {
    if (dist[i] > 1) {
      sendDebugMessage('DISTRIBUTE_CUBES', {
        playerId: 'player2',
        attribute: attr,
        amount: dist[i] - 1,
      });
    }
  });
};

const betaAIConfirm = () => {
  sendDebugMessage('CONFIRM_PHASE', { playerId: 'player2' });
};

const betaAIFinish = () => {
  sendDebugMessage('FINISH_TURN', { playerId: 'player2' });
};

const betaAIOptConfirm = () => {
  sendDebugMessage('CONFIRM_PHASE', { playerId: 'player2' });
};
</script>

<template>
  <div class="relative">
    <!-- Standalone Debug Toolbar -->
    <div
      class="fixed top-4 right-4 z-[100] flex flex-col gap-2 p-2 bg-slate-900/90 backdrop-blur border border-white/10 rounded-2xl shadow-2xl max-w-sm"
    >
      <div class="flex items-center gap-2">
        <div class="px-2 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-white/10 mr-1">
          Debug Sim
        </div>
        <button
          @click="showEvents = !showEvents"
          class="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors"
        >
          Force Event
          <ChevronDown class="w-3 h-3 transition-transform" :class="{ 'rotate-180': showEvents }" />
        </button>
        <button
          @click="startGame"
          class="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors"
        >
          Start
        </button>
      </div>

      <div
        v-if="showEvents"
        class="grid grid-cols-2 gap-1 p-2 bg-black/40 rounded-xl border border-white/5 max-h-64 overflow-y-auto"
      >
        <button
          v-for="e in INITIAL_EVENT_DECK"
          :key="e.id"
          @click="forceEvent(e.id)"
          class="px-2 py-1 text-left text-[8px] font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors truncate"
          :title="e.name"
        >
          {{ e.name }}
        </button>
      </div>

      <div class="flex gap-1">
        <button
          @click="forceBetaAIDistribution"
          class="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors flex-1"
        >
          Force Beta AI Distribution
        </button>
      </div>
      <div class="flex gap-1">
        <button
          @click="betaAIConfirm"
          class="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors flex-1"
        >
          Beta AI Confirm
        </button>

        <button
          @click="betaAIFinish"
          class="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors flex-1"
        >
          Beta AI Finish
        </button>
        <button
          @click="betaAIOptConfirm"
          class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors flex-1"
        >
          Beta AI Opt-Confirm
        </button>
      </div>
    </div>

    <ApexNebula
      :connections="mockConnections"
      :player-infos="mockPlayers"
      :player-names="mockPlayers.map((p) => p.name)"
      :is-initiator="true"
      :ledger="[]"
      @add-ledger="handleAddLedger"
      @finish-game="handleFinishGame"
    />
  </div>
</template>
