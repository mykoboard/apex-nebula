<script setup lang="ts">
import { ref } from 'vue';
import ApexNebula from './ApexNebula.vue';
import type { PlayerInfo, SimpleConnection } from '@mykoboard/integration';
import { INITIAL_EVENT_DECK } from './eventUtils';
import { ChevronDown } from 'lucide-vue-next';

// Mock connection for standalone testing
class MockConnection implements SimpleConnection {
  id: string;
  public listeners: ((data: string) => void)[] = [];

  constructor(id: string) {
    this.id = id;
  }

  send(data: string): void {
    console.log('Mock send:', data);
  }

  addMessageListener(callback: (data: string) => void): void {
    this.listeners.push(callback);
  }

  removeMessageListener(callback: (data: string) => void): void {
    this.listeners = this.listeners.filter((l) => l !== callback);
  }
}

const mockPlayers: PlayerInfo[] = [
  { id: 'player1', name: 'Alpha AI', status: 'game', isConnected: true, isLocal: true, isHost: true },
  { id: 'player2', name: 'Beta AI', status: 'game', isConnected: true, isLocal: false, isHost: false },
];

const mockConnections = ref([new MockConnection('conn1')]);
const showEvents = ref(false);

const handleAddLedger = (action: { type: string; payload: any }) => {
  console.log('Add to ledger:', action);
};

const handleFinishGame = () => {
  console.log('Game finished');
  alert('Game finished! In production, this would return to lobby.');
};

const forceEvent = (eventId: string) => {
  const message = { namespace: 'game', type: 'FORCE_EVENT', payload: { eventId }, senderId: 'debug' };
  mockConnections.value[0].listeners.forEach((l) => l(JSON.stringify(message)));
  showEvents.value = false;
};

const startGame = () => {
  const seed = Math.floor(Math.random() * 1000000);
  const message = { namespace: 'game', type: 'START_GAME', payload: { seed }, senderId: 'debug' };
  mockConnections.value[0].listeners.forEach((l) => l(JSON.stringify(message)));
};

const forceBetaAIDistribution = () => {
  // Deterministic randomization for mock Beta AI
  const dist = [1, 1, 1, 1];
  let remaining = 12;
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
      // Only send if we added something
      const message = {
        namespace: 'game',
        type: 'DISTRIBUTE_CUBES',
        payload: {
          playerId: 'player2',
          attribute: attr,
          amount: dist[i] - 1,
        },
        senderId: 'debug',
      };
      mockConnections.value[0].listeners.forEach((l) => l(JSON.stringify(message)));
    }
  });
};

const betaAIConfirm = () => {
  const message = { namespace: 'game', type: 'CONFIRM_PHASE', payload: { playerId: 'player2' }, senderId: 'debug' };
  mockConnections.value[0].listeners.forEach((l) => l(JSON.stringify(message)));
};

const betaAIFinish = () => {
  const message = { namespace: 'game', type: 'FINISH_TURN', payload: { playerId: 'player2' }, senderId: 'debug' };
  mockConnections.value[0].listeners.forEach((l) => l(JSON.stringify(message)));
};

const betaAIOptConfirm = () => {
  const message = { namespace: 'game', type: 'CONFIRM_PHASE', payload: { playerId: 'player2' }, senderId: 'debug' };
  mockConnections.value[0].listeners.forEach((l) => l(JSON.stringify(message)));
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
