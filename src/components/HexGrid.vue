<script setup lang="ts">
import { computed } from 'vue';
import type { HexCell, PlayerPiece } from '../types';
import { getHexDistance } from '../utils';
import AttributeIcon from './AttributeIcon.vue';

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
    class="relative w-full aspect-square max-w-4xl mx-auto p-8 bg-slate-900/90 rounded-[2.5rem] border border-white/10 shadow-2xl group overflow-hidden"
  >
    <!-- Background Grid Accent -->
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05),transparent)] pointer-events-none"
    />

    <svg viewBox="-450 -450 900 900" class="w-full h-full">
      <!-- Visual Connections/Constellations -->
      <g class="opacity-15">
        <circle cx="0" cy="0" r="120" fill="none" stroke="white" stroke-width="0.5" stroke-dasharray="4 8" />
        <circle cx="0" cy="0" r="230" fill="none" stroke="white" stroke-width="0.5" stroke-dasharray="2 12" />
        <circle cx="0" cy="0" r="340" fill="none" stroke="white" stroke-width="0.5" stroke-dasharray="1 16" />
      </g>

      <g
        v-for="hex in gridWithData"
        :key="hex.id"
        @click="emit('hexClick', hex.id)"
        class="cursor-pointer group/hex"
      >
        <!-- Glow Effect -->
        <polygon
          :points="hex.points"
          :class="hex.isSingularity ? 'fill-indigo-500/20' : 'fill-transparent hover:fill-white/5'"
        />

        <!-- Hex Border -->
        <polygon
          :points="hex.points"
          :style="{ stroke: hex.color }"
          class="stroke-[1.5] group-hover/hex:stroke-[3.5]"
          :class="[
            hex.isSingularity
              ? 'opacity-100'
              : hex.isHome
              ? 'opacity-40'
              : 'opacity-80 group-hover/hex:opacity-100',
            hex.inRange && !hex.isOccupiedByLocal ? 'stroke-[3] stroke-white' : ''
          ]"
        />

        <!-- Hex Labels -->

        <!-- Hex Name/Type -->
        <text
          v-if="!hex.isHome"
          :x="hex.posX"
          :y="hex.posY - 32"
          text-anchor="middle"
          :style="{ fill: hex.color }"
          class="text-[9px] font-black uppercase tracking-widest pointer-events-none select-none"
        >
          <tspan
            v-for="(word, idx) in hex.type.split(/(?=[A-Z])/)"
            :key="idx"
            :x="hex.posX"
            :dy="idx === 0 ? 0 : 10"
          >
            {{ word }}
          </tspan>
        </text>

        <!-- Threshold & Attribute (Native SVG Text) -->
        <g v-if="!hex.isHome" :transform="`translate(${hex.posX}, ${hex.posY - 4})`">
          <text
            text-anchor="middle"
            dominant-baseline="central"
            class="text-[16px] font-black fill-white select-none pointer-events-none"
          >
            {{ hex.threshold > 0 ? hex.threshold : '' }}
            <tspan
              v-if="hex.targetAttribute"
              class="text-[11px] font-bold"
              :fill="hex.color"
              dx="4"
            >
              {{ Array.isArray(hex.targetAttribute) ? hex.targetAttribute.join('/') : hex.targetAttribute }}
            </tspan>
          </text>
        </g>

        <!-- Resource Icons (Bottom) -->
        <g v-if="!hex.isHome" :transform="`translate(${hex.posX}, ${hex.posY + 26})`">
          <g v-if="hex.yield.matter > 0" :transform="hex.yield.data > 0 ? 'translate(-14, 0)' : 'translate(0, 0)'">
            <rect x="-10" y="-10" width="20" height="20" rx="4" fill="#f59e0b" stroke="#fcd34d" stroke-width="1.5" />
            <text
              x="0"
              y="4"
              text-anchor="middle"
              class="text-[13px] font-black fill-amber-950 pointer-events-none select-none"
            >
              {{ hex.yield.matter }}
            </text>
          </g>
          <g v-if="hex.yield.data > 0" :transform="hex.yield.matter > 0 ? 'translate(14, 0)' : 'translate(0, 0)'">
            <circle r="10" fill="#06b6d4" stroke="#67e8f9" stroke-width="1.5" />
            <text
              x="0"
              y="4"
              text-anchor="middle"
              class="text-[13px] font-black fill-cyan-950 pointer-events-none select-none"
            >
              {{ hex.yield.data }}
            </text>
          </g>
        </g>

        <!-- Piece Indicator -->
        <g
          v-for="(p, pIdx) in hex.hexPieces"
          :key="`${p.playerPublicKey}-${pIdx}`"
        >
          <circle
            :cx="hex.posX"
            :cy="hex.posY"
            :r="hex.isSingularity ? '32' : '26'"
            fill="none"
            :stroke="playerColors[p.playerPublicKey]"
            stroke-width="3"
            class="opacity-40"
          />
          <circle :cx="hex.posX" :cy="hex.posY" r="16" :fill="playerColors[p.playerPublicKey]" />
          <circle :cx="hex.posX" :cy="hex.posY" r="8" fill="white" class="opacity-40" />
        </g>
      </g>
    </svg>
  </div>
</template>
