<script setup lang="ts">
import { computed } from 'vue';
import { Dice6, Zap, Crown } from 'lucide-vue-next';
import type { Player, AttributeType } from '../types';
import { calculateMaintenanceCost } from '../utils';

const props = defineProps<{
  state: any;
  localPlayer: Player | null | undefined;
  localGenome: any;
  isInitiator: boolean;
  currentPlayer: Player | null | undefined;
  isLocalPlayerTurn: boolean;
}>();

const emit = defineEmits<{
  (e: 'action', type: string, payload: any): void;
}>();

const handleAction = (type: string, payload: any) => emit('action', type, payload);
const confirmedLocal = computed(() => props.state.context.confirmedPlayers.includes(props.localPlayer?.id || ''));
</script>

<template>
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
      <!-- Setup Phase -->
      <div v-if="state.matches('setupPhase')" class="space-y-4">
        <p class="text-[10px] text-slate-400 leading-relaxed italic">
          Distribute 12 cubes to initialize your configuration.
        </p>
        <button
          @click="handleAction('CONFIRM_PHASE', { playerId: localPlayer?.id })"
          :disabled="!localGenome || localGenome.cubePool > 0 || confirmedLocal"
          class="w-full uppercase font-black tracking-widest text-[10px] h-10 rounded-xl transition-all"
          :class="[
            confirmedLocal
              ? 'bg-slate-800 text-slate-500'
              : localGenome?.cubePool === 0
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
              : 'bg-indigo-900/40 text-indigo-400/50 cursor-not-allowed border border-indigo-500/20'
          ]"
        >
          {{ confirmedLocal ? 'Confirmed' : localGenome?.cubePool === 0 ? 'Confirm Setup' : `${localGenome?.cubePool} Cubes Remaining` }}
        </button>
      </div>

      <!-- Mutation Phase -->
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
                    <div v-if="state.context.genomes.find((g: any) => g.playerId === p.id)" class="px-1 bg-emerald-500/20 rounded text-[8px] font-black text-emerald-400" title="Total Modifier">
                      Σ {{ (state.context.genomes.find((g: any) => g.playerId === p.id)?.mutationModifiers?.[state.context.mutationResults[p.id].attr] ?? 0) > 0 ? '+' : '' }}{{ state.context.genomes.find((g: any) => g.playerId === p.id)?.mutationModifiers?.[state.context.mutationResults[p.id].attr] ?? 0 }}
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
            :disabled="confirmedLocal"
            class="w-full uppercase font-black tracking-widest text-[10px] h-10 rounded-xl transition-all"
            :class="[
              confirmedLocal
                ? 'bg-slate-800 text-slate-500'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
            ]"
          >
            {{ confirmedLocal ? 'Confirmed' : 'Confirm Phase' }}
          </button>
        </div>
      </div>

      <!-- Phenotype Phase -->
      <div v-if="state.matches('phenotypePhase')" class="space-y-4">
        <div v-if="isLocalPlayerTurn" class="space-y-3">
          <div class="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
            <p class="text-[10px] font-black text-indigo-400 uppercase">Movement Active</p>
            <p class="text-xs font-black text-white">
              {{ Math.max(0, (localGenome?.baseAttributes.NAV || 0) + (localGenome?.mutationModifiers.NAV || 0) + (localGenome?.tempAttributeModifiers.NAV || 0) - (state.context.phenotypeActions[localPlayer?.id!]?.movesMade || 0)) }} Units
            </p>
          </div>
          <button
            @click="handleAction('FINISH_TURN', { playerId: localPlayer?.id })"
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
            <span class="truncate max-w-[70px]">{{ state.context.players.find((pl: Player) => pl.id === res.playerId)?.name || 'Unknown' }}</span>
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

      <!-- Environmental Phase -->
      <div v-if="state.matches('environmentalPhase')" class="space-y-4">
        <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
          <template v-for="(res, pid) in state.context.lastEventResults" :key="pid">
            <div class="p-2 rounded-lg border flex items-center justify-between font-black text-[9px] uppercase tracking-tight" :class="res.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'">
              <span class="truncate max-w-[80px]">{{ state.context.players.find((pl: Player) => pl.id === pid)?.name }}</span>
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

      <!-- Competitive Phase -->
      <button
        v-if="state.matches('competitivePhase') && isInitiator"
        @click="handleAction('NEXT_PHASE', {})"
        class="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-[0.2em]"
      >
        Resolve Competitive
      </button>

      <!-- Optimization Phase -->
      <div v-if="state.matches('optimizationPhase')" class="space-y-4">
        <div class="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-black text-indigo-400 uppercase">Data Optimization</span>
            <span class="text-[10px] font-black text-white">{{ localGenome?.dataClusters || 0 }}/3</span>
          </div>
          <button
            @click="handleAction('OPTIMIZE_DATA', { playerId: localPlayer?.id })"
            :disabled="!localGenome || localGenome.dataClusters < 3 || confirmedLocal"
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
              :disabled="!localGenome || localGenome.baseAttributes[attr] <= 1 || confirmedLocal"
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
            :disabled="confirmedLocal"
            class="w-full h-12 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
            :class="[
              confirmedLocal
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : (localGenome?.rawMatter || 0) >= calculateMaintenanceCost(localGenome!)
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-red-900/40 text-red-400 border border-red-500/20'
            ]"
          >
            <template v-if="localGenome">
              {{ confirmedLocal
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
</template>
