<script lang="ts" setup>
import { computed } from 'vue';
import NodeOutputTable from './NodeOutputTable.vue';
import { Vec3, clamp } from '$/util';
import { rgbToHsl, rgbToHwb } from '$/color-management/';

const props = defineProps<{
  rgbVec: Vec3,
}>();

const to255 = (channel: number) => Math.round(clamp(channel, 0, 1) * 255);
const toHex = (channel: number) => to255(channel).toString(16).padStart(2, "0");
const toHex3 = (channel: number) => Math.round(clamp(channel, 0, 1) * 15).toString(16);

const hueStrings = (rgb: Vec3, fn: (rgb: Vec3) => number[]) => {
  const hxx = fn(props.rgbVec);
  return [Number((hxx[0] * 360).toFixed(1)).toString(), `${Number((hxx[1] * 100).toFixed(2))}%`, `${Number((hxx[2] * 100).toFixed(2))}%`];
};

const hex = computed(() => `#${props.rgbVec.map(toHex).join("")}`);
const hex3 = computed(() => `#${props.rgbVec.map(toHex3).join("")}`);
const rgb = computed(() => `rgb(${props.rgbVec.map(to255).join(" ")})`);
const hsl = computed(() => `hsl(${hueStrings(props.rgbVec, rgbToHsl).join(" ")})`);
const hwb = computed(() => `hwb(${hueStrings(props.rgbVec, rgbToHwb).join(" ")})`);
const rgbLegacy = computed(() => `rgb(${props.rgbVec.map(to255).join(", ")})`);
const hslLegacy = computed(() => `hsl(${hueStrings(props.rgbVec, rgbToHsl).join(", ")})`);
// const hexa = computed(() => `${hex.value}ff`);
// const hex3a = computed(() => `${hex3.value}f`);
// const rgba = computed(() => `rgb(${props.color.map(to255).join(" ")} / 1)`);
// const rgbaLegacy = computed(() => `rgba(${props.color.map(to255).join(", ")}, 1)`);
// const hsla = computed(() => `hsl(${hslStrings(props.color).join(" ")} / 1)`);
// const hslaLegacy = computed(() => `hsla(${hslStrings(props.color).join(", ")}, 1)`);
</script>

<template>
  <NodeOutputTable
      :labels="[
        'label.hex',
        'label.hex3',
        'label.rgb',
        'label.hsl',
        'label.hsv',
        'label.rgbLegacy',
        'label.hslLegacy',
      ]"
      :values="[
        hex,
        hex3,
        rgb,
        hsl,
        hwb,
        rgbLegacy,
        hslLegacy,
      ]"
      :useInputs="true"
      v-if="props.rgbVec"/>
  
  <div v-else>
    No color attached
  </div>
</template>