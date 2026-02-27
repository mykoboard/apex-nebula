<script setup lang="ts">
import { computed } from 'vue';
import type { HexCell, PlayerPiece } from '../types';
import { getHexDistance } from '../utils';

interface Props {
  hexGrid: HexCell[];
  pieces: PlayerPiece[];
  playerColors: Record<string, string>;
  currentHexId?: string;
  maxDistance?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'hexClick', id: string): void;
}>();

const SKILL_COLORS: Record<string, string> = {
  NAV: '#3b82f6', // Blue
  LOG: '#06b6d4', // Cyan
  DEF: '#ef4444', // Red
  SCN: '#10b981', // Emerald
  MULTI: '#818cf8', // Indigo for multi-attribute
  HOME: '#ffffff', // White for starting locations
  SINGULARITY: '#f0abfc', // Fuchsia
};

const getHexColor = (hex: HexCell) => {
  if (hex.type === 'Singularity') return SKILL_COLORS.SINGULARITY;
  if (hex.type === 'HomeNebula') return SKILL_COLORS.HOME;
  if (Array.isArray(hex.targetAttribute)) return SKILL_COLORS.MULTI;
  return SKILL_COLORS[hex.targetAttribute as string] || '#94a3b8';
};

const currentHex = computed(() => props.hexGrid.find((h) => h.id === props.currentHexId));

const gridWithData = computed(() => {
  return props.hexGrid.map(hex => {
    const size = 57.2;
    const spacing = 1.05;
    const posX = hex.x * (size * 1.5 * spacing);
    const posY = (hex.y + hex.x / 2) * (Math.sqrt(3) * size * spacing);

    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      points.push(`${posX + size * Math.cos(angle)},${posY + size * Math.sin(angle)}`);
    }

    const distance = currentHex.value && props.maxDistance !== undefined
      ? getHexDistance(currentHex.value.x, currentHex.value.y, hex.x, hex.y)
      : Infinity;
    
    return {
      ...hex,
      posX,
      posY,
      points: points.join(' '),
      isSingularity: hex.type === 'Singularity',
      isHome: hex.type === 'HomeNebula',
      color: getHexColor(hex),
      inRange: distance <= (props.maxDistance || 0),
      isOccupiedByLocal: props.currentHexId === hex.id,
      hexPieces: props.pieces.filter((p) => p.hexId === hex.id),
    };
  });
});
</script>

<template>
  <div
    class="relative w-full aspect-square max-w-4xl mx-auto p-12 bg-slate-900/50 rounded-[3rem] border border-white/5 backdrop-blur-2xl shadow-2xl ring-1 ring-white/5 group overflow-hidden"
  >
    <!-- Background Grid Accent -->
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05),transparent)] pointer-events-none"
    />

    <svg viewBox="-450 -450 900 900" class="w-full h-full drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <!-- Visual Connections/Constellations -->
      <g class="opacity-10">
        <circle cx="0" cy="0" r="120" fill="none" stroke="white" stroke-width="0.5" stroke-dasharray="4 8" />
        <circle cx="0" cy="0" r="230" fill="none" stroke="white" stroke-width="0.5" stroke-dasharray="2 12" />
        <circle cx="0" cy="0" r="340" fill="none" stroke="white" stroke-width="0.5" stroke-dasharray="1 16" />
      </g>

      <g
        v-for="hex in gridWithData"
        :key="hex.id"
        @click="emit('hexClick', hex.id)"
        class="cursor-pointer group/hex transition-all duration-500"
      >
        <!-- Glow Effect -->
        <polygon
          :points="hex.points"
          class="transition-all duration-700"
          :class="hex.isSingularity ? 'fill-indigo-500/20' : 'fill-transparent hover:fill-white/5'"
        />

        <!-- Hex Border -->
        <polygon
          :points="hex.points"
          :style="{ stroke: hex.color }"
          class="transition-all duration-300 stroke-[1.5] group-hover/hex:stroke-[3.5]"
          :class="[
            hex.isSingularity
              ? 'opacity-100 shadow-[0_0_20px_rgba(129,140,248,0.5)]'
              : hex.isHome
              ? 'opacity-40'
              : 'opacity-80 group-hover/hex:opacity-100',
            hex.inRange && !hex.isOccupiedByLocal ? 'stroke-[4] stroke-white drop-shadow-[0_0_8px_white]' : ''
          ]"
        />

        <!-- Hex Center Point & Labels -->
        <circle v-if="!hex.isHome" :cx="hex.posX" :cy="hex.posY" r="2" :style="{ fill: hex.color }" />

        <!-- Hex Name/Type -->
        <text
          v-if="!hex.isHome"
          :x="hex.posX"
          :y="hex.posY - 28"
          text-anchor="middle"
          :style="{ fill: hex.color }"
          class="text-[8px] font-black uppercase tracking-widest pointer-events-none select-none"
        >
          <tspan
            v-for="(word, idx) in hex.type.split(/(?=[A-Z])/)"
            :key="idx"
            :x="hex.posX"
            :dy="idx === 0 ? 0 : 8"
          >
            {{ word }}
          </tspan>
        </text>

        <!-- Resource Icons -->
        <g v-if="!hex.isHome" :transform="`translate(${hex.posX}, ${hex.posY})`">
          <g v-if="hex.yield.matter > 0" transform="translate(-32, 0)">
            <rect x="-8" y="-8" width="16" height="16" rx="2" class="fill-amber-500/80" />
            <text
              x="0"
              y="2"
              text-anchor="middle"
              class="text-[12px] font-black fill-slate-900 pointer-events-none select-none"
            >
              {{ hex.yield.matter }}
            </text>
          </g>
          <g v-if="hex.yield.data > 0" transform="translate(32, 0)">
            <circle r="8" class="fill-cyan-500/80" />
            <text
              x="0"
              y="2"
              text-anchor="middle"
              class="text-[12px] font-black fill-slate-900 pointer-events-none select-none"
            >
              {{ hex.yield.data }}
            </text>
          </g>
        </g>

        <!-- Threshold & Attribute -->
        <g v-if="!hex.isHome" :transform="`translate(${hex.posX}, ${hex.posY + 18})`">
          <text x="0" y="0" text-anchor="middle" class="text-[14px] font-black fill-white pointer-events-none select-none">
            {{ hex.threshold > 0 ? hex.threshold : '' }}
          </text>
          <text
            x="0"
            y="10"
            text-anchor="middle"
            class="text-[7px] font-bold fill-slate-500 uppercase tracking-widest pointer-events-none select-none"
          >
            {{ Array.isArray(hex.targetAttribute) ? hex.targetAttribute.join('·') : hex.targetAttribute }}
          </text>
        </g>

        <!-- Piece Indicator -->
        <g
          v-for="(p, pIdx) in hex.hexPieces"
          :key="`${p.playerId}-${pIdx}`"
          class="animate-in zoom-in-50 fade-in duration-500"
        >
          <circle
            :cx="hex.posX"
            :cy="hex.posY"
            :r="hex.isSingularity ? '35' : '28'"
            fill="none"
            :stroke="playerColors[p.playerId]"
            stroke-width="4"
            class="opacity-20 animate-pulse"
          />
          <circle :cx="hex.posX" :cy="hex.posY" r="18" :fill="playerColors[p.playerId]" class="shadow-xl" />
          <circle :cx="hex.posX" :cy="hex.posY" r="12" fill="white" class="opacity-20" />
        </g>
      </g>
    </svg>
  </div>
</template>
