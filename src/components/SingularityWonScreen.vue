<script setup lang="ts">
import { Trophy } from 'lucide-vue-next';

defineProps<{
  winnerNames: string[];
}>();

const emit = defineEmits<{
  (e: 'action', type: string, payload: any): void;
  (e: 'exit'): void;
}>();
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-[#020617]/90 backdrop-blur-3xl p-4 animate-in fade-in duration-500">
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
          @click="emit('action', 'RESET', {})"
          class="flex-1 h-16 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all"
        >
          New Evolution Cycle
        </button>
        <button
          @click="emit('exit')"
          class="flex-1 h-16 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-sm uppercase tracking-[0.2em] border border-white/5 transition-all"
        >
          Exit to Lobby
        </button>
      </div>
    </div>
  </div>
</template>
