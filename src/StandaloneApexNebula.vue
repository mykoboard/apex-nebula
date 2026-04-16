<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ApexNebula from './ApexNebula.vue';
import type { PlayerInfo, SimpleConnection } from '@mykoboard/integration';
import { createLocalWebRTCPair, createGameMessage } from '@mykoboard/integration';
import { INITIAL_EVENT_DECK } from './eventUtils';
import { ChevronDown } from 'lucide-vue-next';
import { logger } from './lib/logger';

const mockPlayers: PlayerInfo[] = [
  { publicKey: 'player1', id: 'player1', name: 'Alpha AI', status: 'game', isConnected: true, isLocal: true, isHost: true },
  { publicKey: 'player2', id: 'player2', name: 'Beta AI', status: 'game', isConnected: true, isLocal: false, isHost: false },
];

const mockConnections = ref<SimpleConnection[]>([]);
let remoteProxy: SimpleConnection | null = null;
const showEvents = ref(false);
const isProcessing = ref(false);
const restartKey = ref(0);

const handleReset = () => {
  restartKey.value++;
  logger.info('Resetting simulator state');
};

onMounted(async () => {
  logger.net('Initializing WebRTC pair');
  const [connA, connB] = await createLocalWebRTCPair();
  logger.net('WebRTC pair ready', { connA: connA.id });
  
  mockConnections.value = [connA];
  remoteProxy = connB;

  remoteProxy.addMessageListener((data) => {
    const msg = JSON.parse(data);
    // Ignore frequent SYNC_STATE logs to keep console clean, only log other types
    if (msg.type !== 'SYNC_STATE') {
      logger.net('Remote received from game', msg);
    }
  });
});

const handleAddLedger = (action: { type: string; payload: any }) => {
  logger.ledger('Add block', action);
};

const handleFinishGame = () => {
  logger.info('Game finished');
  alert('Game finished! In production, this would return to lobby.');
};

const sendDebugMessage = (type: string, payload: any) => {
  if (!remoteProxy) {
    logger.error('Cannot send message', 'remoteProxy not initialized');
    return;
  }
  const message = createGameMessage(type, payload);
  logger.net('Simulating remote message', { type, message });
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

const forceBetaAIDistribution = async () => {
  if (isProcessing.value) return;
  isProcessing.value = true;
  try {
    logger.info('Forcing Beta AI Distribution & Ready');
    const dist = [1, 1, 1, 1];
    let remaining = 8;
    while (remaining > 0) {
      const idx = Math.floor(Math.random() * 4);
      if (dist[idx] < 6) {
        dist[idx]++;
        remaining--;
      }
    }
    const attrs = ['NAV', 'LOG', 'DEF', 'SCN'];
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i] as any;
      if (dist[i] > 1) {
        sendDebugMessage('DISTRIBUTE_CUBES', {
          playerPublicKey: 'player2',
          attribute: attr,
          amount: dist[i] - 1,
        });
        await new Promise(r => setTimeout(r, 50));
      }
    }
    sendDebugMessage('CONFIRM_PHASE', { playerPublicKey: 'player2' });
  } finally {
    isProcessing.value = false;
  }
};

const betaAIConfirm = () => {
  sendDebugMessage('CONFIRM_PHASE', { playerPublicKey: 'player2' });
};

const betaAIFinish = () => {
  sendDebugMessage('FINISH_TURN', { playerPublicKey: 'player2' });
};

const betaAIOptConfirm = () => {
  sendDebugMessage('CONFIRM_PHASE', { playerPublicKey: 'player2' });
};

const forceAlphaAIDistribution = async () => {
  if (isProcessing.value) return;
  isProcessing.value = true;
  try {
    logger.info('Forcing Alpha AI Distribution & Ready');
    const attrs: any[] = ['NAV', 'LOG', 'DEF', 'SCN'];
    for (const attr of attrs) {
      sendDebugMessage('DISTRIBUTE_CUBES', {
        playerPublicKey: 'player1',
        attribute: attr,
        amount: 2,
      });
      await new Promise(r => setTimeout(r, 50));
    }
    sendDebugMessage('CONFIRM_PHASE', { playerPublicKey: 'player1' });
  } finally {
    isProcessing.value = false;
  }
};

const forceAllReady = async () => {
  await forceBetaAIDistribution();
  await forceAlphaAIDistribution();
};
</script>

<template>
  <div class="relative min-h-screen bg-[#020617] text-white">
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
        <button
          @click="handleReset"
          class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold uppercase rounded-md transition-colors"
        >
          Reset
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
        <button
          @click="forceAllReady"
          class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors flex-1"
        >
          All Ready
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
      :key="restartKey"
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
