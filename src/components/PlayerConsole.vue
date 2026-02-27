<script setup lang="ts">
import { computed } from 'vue';
import { Database, Zap, Shield, Cpu, Box, HardDrive, Heart } from 'lucide-vue-next';
import type { AttributeType, PlayerGenome } from '../types';
import { calculateMaintenanceCost } from '../utils';

interface Props {
  genome: PlayerGenome;
  editable?: boolean;
  setupLimit?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'distribute', attribute: AttributeType, amount: number): void;
}>();

const attributes = [
  { type: 'NAV' as const, label: 'Navigation', icon: Zap, color: 'text-blue-400' },
  { type: 'LOG' as const, label: 'Logic', icon: Cpu, color: 'text-green-400' },
  { type: 'DEF' as const, label: 'Defense', icon: Shield, color: 'text-red-400' },
  { type: 'SCN' as const, label: 'Sensors', icon: HardDrive, color: 'text-yellow-400' },
];

const allocatedPoints = computed(() => Object.values(props.genome.baseAttributes).reduce((sum, val) => sum + val, 0));
const requiredMatter = computed(() => calculateMaintenanceCost(props.genome));

const handleSlotClick = (attrType: AttributeType, slotIndex: number) => {
  if (!props.editable) return;
  const targetValue = slotIndex + 1;
  if (props.setupLimit && targetValue > props.setupLimit) return;
  const currentValue = props.genome.baseAttributes?.[attrType] ?? 0;
  if (targetValue === currentValue) return;

  // During setupLimit (Setup Phase), allow free reallocation (reductions too)
  // During Optimization (no setupLimit), reductions mean pruning and MUST only happen 1 at a time (click immediate previous level)
  if (!props.setupLimit && targetValue < currentValue) {
    if (targetValue === currentValue - 1) {
      emit('distribute', attrType, -1);
    }
    return; // Disallow pruning more than 1 at a time
  }

  emit('distribute', attrType, targetValue - currentValue);
};

const getSlotClass = (attrType: AttributeType, i: number, colorClass: string) => {
  const currentValue = props.genome.baseAttributes?.[attrType] ?? 0;
  const isFilled = i < currentValue;
  const isSetupLimited = props.setupLimit && i >= props.setupLimit;
  
  let classes = 'flex-1 h-full rounded-sm border transition-all duration-300 relative group/slot ';
  
  if (props.editable && (props.setupLimit ? i < props.setupLimit : i >= currentValue || i === currentValue - 1)) {
    classes += 'cursor-pointer hover:ring-2 hover:ring-white/30 hover:scale-[1.05] hover:z-10 ';
  } else {
    classes += 'cursor-not-allowed opacity-40 ';
  }
  
  if (isFilled) {
    const fromColor = colorClass.replace('text', 'from').replace('-400', '-500');
    const toColor = colorClass.replace('text', 'to').replace('-400', '-700');
    classes += `bg-gradient-to-br ${fromColor} ${toColor} shadow-[0_0_10px_rgba(0,0,0,0.5)] border-white/20`;
  } else if (isSetupLimited) {
    classes += 'bg-slate-950/20 border-slate-900/50';
  } else {
    classes += 'bg-slate-950/50 border-slate-800/50 shadow-inner';
  }
  
  return classes;
};
</script>

<template>
  <div class="bg-slate-900/90 border-2 border-slate-800 rounded-xl p-6 shadow-2xl backdrop-blur-md w-full max-w-2xl">
    <div class="flex justify-between items-center mb-6">
      <div class="flex flex-col">
        <h3 class="text-xl font-black text-white tracking-widest uppercase flex items-center gap-2">
          <Box class="w-6 h-6 text-indigo-400" />
          Genome Console
        </h3>
        <!-- Stability Track -->
        <div class="flex items-center gap-2 mt-1">
          <Heart class="w-3 h-3 text-red-500 fill-red-500/20" />
          <div class="flex gap-1">
            <div
              v-for="(_, i) in 3"
              :key="i"
              class="w-3 h-3 rounded-sm border transition-all"
              :class="[
                i < genome.stability
                  ? 'bg-red-500 border-red-400 shadow-[0_0_5px_rgba(239,68,68,0.5)]'
                  : 'bg-slate-900 border-slate-800'
              ]"
            />
          </div>
          <span class="text-[10px] font-black text-red-400 uppercase tracking-tighter ml-1">Stability</span>
        </div>
      </div>
      <div class="flex items-center gap-6">
        <div class="flex flex-col items-end">
          <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Allocated</span>
          <span class="text-sm font-black text-white px-2 py-0.5 bg-white/5 rounded-md ring-1 ring-white/10">{{ allocatedPoints }}</span>
        </div>
        <div class="flex flex-col items-end">
          <span class="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Pool</span>
          <span
            class="text-sm font-black px-2 py-0.5 rounded-md ring-1 transition-all"
            :class="genome.cubePool > 0 ? 'text-indigo-400 bg-indigo-500/20 ring-indigo-500/30' : 'text-slate-500 bg-slate-900 ring-transparent'"
          >
            {{ genome.cubePool }}
          </span>
        </div>
      </div>
    </div>

    <!-- Attribute Tracks -->
    <div class="space-y-6 mb-8">
      <div v-for="attr in attributes" :key="attr.type" class="group">
        <div class="flex justify-between items-end mb-2">
          <div class="flex items-center gap-2">
            <component :is="attr.icon" class="w-4 h-4" :class="attr.color" />
            <span class="text-xs font-bold uppercase tracking-widest" :class="attr.color">
              {{ attr.label }}
            </span>
          </div>
          <div class="flex items-center">
            <span class="text-lg font-black text-white tabular-nums w-4 text-center">
              {{ genome.baseAttributes?.[attr.type] ?? 0 }}
            </span>
          </div>
        </div>

        <!-- Slot Track -->
        <div class="flex items-center gap-3">
          <div class="flex gap-1.5 h-6 flex-1">
            <div
              v-for="(_, i) in 10"
              :key="i"
              @click="handleSlotClick(attr.type, i)"
              :class="getSlotClass(attr.type, i, attr.color)"
            >
              <!-- Setup Limit Indicator -->
              <div
                v-if="setupLimit && i === setupLimit - 1"
                class="absolute inset-y-0 -right-[4px] w-[2px] bg-indigo-500/30 z-20 pointer-events-none"
                title="Setup Limit"
              />
            </div>
          </div>
          <!-- Mutation Modifier Circular Slot -->
          <div
            class="w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-black transition-all"
            :class="[
              Math.abs(genome.mutationModifiers?.[attr.type] || 0) > 0
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                : 'bg-slate-950 border-slate-800 text-slate-700'
            ]"
          >
            {{ genome.mutationModifiers?.[attr.type] ? (genome.mutationModifiers[attr.type] > 0 ? `+${genome.mutationModifiers[attr.type]}` : genome.mutationModifiers[attr.type]) : '' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Resource Trays -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Box class="w-5 h-5 text-amber-500" />
          <div>
            <div class="text-[10px] font-bold text-slate-500 uppercase leading-none truncate">Matter</div>
            <div class="text-xl font-black text-white leading-tight">{{ genome.rawMatter }}</div>
          </div>
        </div>
        <!-- Visual Matter Stack & Requirement -->
        <div class="flex flex-col items-end gap-1">
          <div class="flex flex-wrap-reverse gap-0.5 w-12 justify-end">
            <div v-for="(_, i) in Math.min(genome.rawMatter, 10)" :key="i" class="w-2 h-2 bg-amber-600 rounded-sm shadow-sm" />
          </div>
          <div
            class="text-[8px] font-black uppercase px-2 py-0.5 rounded-full ring-1"
            :class="genome.rawMatter < requiredMatter ? 'bg-red-500/20 text-red-500 ring-red-500/30' : 'bg-slate-900/50 text-slate-500 ring-white/5'"
          >
            Required: {{ requiredMatter }}
          </div>
        </div>
      </div>

      <div class="bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Database class="w-5 h-5 text-cyan-500" />
          <div>
            <div class="text-[10px] font-bold text-slate-500 uppercase leading-none">Data</div>
            <div class="text-xl font-black text-white leading-tight">{{ genome.dataClusters }}</div>
          </div>
        </div>
        <!-- Visual Data Stack -->
        <div class="flex flex-wrap-reverse gap-0.5 w-12 justify-end">
          <div v-for="(_, i) in Math.min(genome.dataClusters, 10)" :key="i" class="w-2 h-2 bg-cyan-600 rounded-sm shadow-sm" />
        </div>
      </div>
    </div>
  </div>
</template>
