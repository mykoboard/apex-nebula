<script setup lang="ts">
import { Layers, RotateCcw } from 'lucide-vue-next';
import type { EnvironmentalEvent } from '../types';

interface Props {
  deck: EnvironmentalEvent[];
  discard: EnvironmentalEvent[];
}

defineProps<Props>();
</script>

<template>
  <div class="flex gap-6 items-center p-6 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-xl">
    <!-- Draw Pile -->
    <div class="relative group cursor-help" :title="`Events remaining: ${deck.length}`">
      <div
        class="w-16 h-24 bg-slate-800 rounded-xl border-2 border-slate-700 flex flex-col items-center justify-center transition-all group-hover:border-purple-500/50 group-hover:bg-slate-800/80 shadow-lg"
      >
        <Layers class="w-6 h-6 text-slate-500 group-hover:text-purple-400 mb-1" />
        <span class="text-[10px] font-black text-slate-600 group-hover:text-purple-400">{{ deck.length }}</span>
      </div>
      <!-- Depth effect -->
      <div class="absolute -bottom-1 -right-1 w-16 h-24 bg-slate-900 rounded-xl border border-slate-800 -z-10" />
      <div class="absolute -bottom-2 -right-2 w-16 h-24 bg-slate-950 rounded-xl border border-slate-900 -z-20 opacity-50" />
    </div>

    <!-- Deck Descriptor -->
    <div class="flex flex-col">
      <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Event Deck</span>
    </div>

    <div class="flex-1" />

    <!-- Discard Pile -->
    <div
      class="relative group opacity-60 hover:opacity-100 transition-opacity cursor-help"
      :title="`Discard pile: ${discard.length}`"
    >
      <div
        class="w-16 h-24 bg-black/40 rounded-xl border-2 border-white/5 flex flex-col items-center justify-center border-dashed"
      >
        <RotateCcw class="w-5 h-5 text-slate-700 mb-1" />
        <span class="text-[10px] font-black text-slate-700">{{ discard.length }}</span>
      </div>
    </div>
  </div>
</template>
