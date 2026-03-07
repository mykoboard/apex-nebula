<script setup lang="ts">
import { Zap, Cpu, Shield, HardDrive } from 'lucide-vue-next';
import type { AttributeType } from '../types';

defineProps<{
  type: AttributeType;
  size?: number | string;
}>();

const iconMap = {
  NAV: Zap,
  LOG: Cpu,
  DEF: Shield,
  SCN: HardDrive,
};
</script>

<template>
  <component 
    :is="iconMap[type]" 
    :size="size || 16" 
    v-bind="$attrs" 
  />
</template>
