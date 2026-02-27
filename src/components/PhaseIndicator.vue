<script setup lang="ts">
import { Dna, Navigation, CloudLightning, Swords, Settings, Clock } from 'lucide-vue-next';
import type { GamePhase } from '../types';

interface Props {
  currentPhase: GamePhase;
  round: number;
}

defineProps<Props>();

const phases = [
  { id: 'waiting', name: 'Initialization', icon: Clock, desc: 'Awaiting Synapse' },
  { id: 'setup', name: 'Configuration', icon: Settings, desc: 'Genome Initialization' },
  { id: 'mutation', name: 'Mutation', icon: Dna, desc: 'Stochastic Evolution' },
  { id: 'phenotype', name: 'Phenotype', icon: Navigation, desc: 'Expression Phase' },
  { id: 'environmental', name: 'Environmental', icon: CloudLightning, desc: 'Selection Pressure' },
  { id: 'competitive', name: 'Competitive', icon: Swords, desc: 'Conflict Resolution' },
  { id: 'optimization', name: 'Optimization', icon: Settings, desc: 'Genome Refinement' },
] as const;
</script>

<template>
  <div class="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-xl shadow-inner">
    <!-- Stellar Epoch -->
    <div class="flex items-center gap-8 mb-6">
      <div class="w-32">
        <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Generation</p>
        <p class="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">Evolution Cycle</p>
      </div>
      <div class="flex gap-3">
        <div v-for="r in [1, 2, 3, 4, 5]" :key="r" class="relative group/round">
          <div
            class="w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-500"
            :class="[
              round === r
                ? 'bg-purple-500/20 border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'bg-black/40 border-white/5 group-hover/round:border-white/10'
            ]"
          >
            <span
              class="text-[10px] font-black transition-colors"
              :class="round === r ? 'text-purple-400' : 'text-slate-600'"
            >
              {{ r }}
            </span>
            <div v-if="round === r" class="absolute -top-1 -right-1 animate-in zoom-in-50 duration-500">
              <div class="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-lg border border-white/20">
                <div class="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="h-px w-full bg-white/5 mb-6" />

    <!-- Protocol Phase Track -->
    <div class="flex items-center gap-8">
      <div class="w-32">
        <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Phase Sequence</p>
        <p class="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">Genetic Algorithm</p>
      </div>
      <div class="flex gap-4 flex-wrap">
        <div v-for="(p, idx) in phases" :key="p.id" class="flex items-center gap-4">
          <div
            class="flex flex-col p-3 rounded-2xl border-2 transition-all duration-500 min-w-[140px] relative"
            :class="[
              currentPhase === p.id
                ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'bg-black/40 border-white/5 opacity-40'
            ]"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-2 h-2 rounded-full"
                :class="currentPhase === p.id ? 'bg-purple-500 animate-pulse' : 'bg-slate-600'"
              />
              <span
                class="text-[10px] font-black uppercase tracking-widest"
                :class="currentPhase === p.id ? 'text-purple-400' : 'text-slate-500'"
              >
                {{ p.name }}
              </span>
            </div>
            <span class="text-[8px] font-bold text-slate-600 uppercase mt-1 ml-4">{{ p.desc }}</span>
            <div
              v-if="currentPhase === p.id"
              class="absolute -left-2 top-1/2 -translate-y-1/2 animate-in slide-in-from-left-2 duration-500"
            >
              <div class="w-1 h-8 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
            </div>
          </div>
          <div v-if="idx < phases.length - 1" class="w-4 h-px bg-white/10" />
        </div>
      </div>
    </div>
  </div>
</template>
