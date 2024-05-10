<script lang="ts" setup>
import { PropType, computed } from 'vue';
import NodeOutputTable from './NodeOutputTable.vue';
import { Vec3, clamp, to255, toHex, toHex3 } from '@/util';
import * as cm from '@/models/colormanagement';
import getString, { StringKey } from '@/strings';

const props = defineProps<{
  color?: cm.Col,
}>();


const hueStrings = (color: cm.Col, fn: (rgb: Vec3) => number[]) => {
  const hxx = fn([...cm.Srgb.from(color)] as Vec3);
  return [Number((hxx[0] * 360).toFixed(1)).toString(), `${Number((hxx[1] * 100).toFixed(2))}%`, `${Number((hxx[2] * 100).toFixed(2))}%`];
};

const labStrings = (color: cm.Col, fn: (color: cm.Col) => number[]) => {
  const lab = fn(color);
  return [`${Number(lab[0].toFixed(2))}%`, Number(lab[1].toFixed(2)), Number(lab[2].toFixed(2))];
};

const oklabStrings = (color: cm.Col, fn: (color: cm.Col) => number[]) => {
  const lab = fn(color);
  return [`${Number((lab[0] * 100).toFixed(2))}%`, Number(lab[1].toFixed(2)), Number(lab[2].toFixed(2))];
};

const hex = computed(() => props.color ? `#${cm.Srgb.from(props.color).map(toHex).join("")}` : "--");
const hex3 = computed(() => props.color ? `#${cm.Srgb.from(props.color).map(toHex3).join("")}` : "--");
const rgb = computed(() => props.color ? `rgb(${cm.Srgb.from(props.color).map(to255).join(" ")})` : "--");
const hsl = computed(() => props.color ? `hsl(${hueStrings(props.color, cm.rgbToHsl).join(" ")})` : "--");
const hwb = computed(() => props.color ? `hwb(${hueStrings(props.color, cm.rgbToHwb).join(" ")})` : "--");
const rgbLegacy = computed(() => props.color ? `rgb(${cm.Srgb.from(props.color).map(to255).join(", ")})` : "--");
const hslLegacy = computed(() => props.color ? `hsl(${hueStrings(props.color, cm.rgbToHsl).join(", ")})` : "--");

const lab = computed(() => props.color ? `lab(${labStrings(props.color, color => cm.Cielab.from(color)).join(" ")})` : "--");
const lchab = computed(() => props.color ? `lch(${labStrings(props.color, color => cm.lxyToLch(cm.Cielab.from(color) as unknown as Vec3)).join(" ")})` : "--");

const oklab = computed(() => props.color ? `oklab(${oklabStrings(props.color, color => cm.Oklab.from(color)).join(" ")})` : "--");
const oklchab = computed(() => props.color ? `oklch(${oklabStrings(props.color, color => cm.lxyToLch(cm.Oklab.from(color) as unknown as Vec3)).join(" ")})` : "--");
</script>

<template>
  <div class="table-container">
    <div
      class="heading"
      v-html="getString('label.srgb')"
    ></div>
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
        :useInputs="true" />

    <div
      class="heading"
      v-html="getString('label.cielab.cielab')"
    ></div>
    <NodeOutputTable
        :labels="[
          'label.cielab',
          'label.cielch',
        ]"
        :values="[
          lab,
          lchab,
        ]"
        :useInputs="true" />
    <div
      class="heading"
      v-html="getString('label.oklab')"
    ></div>
    <NodeOutputTable
        :labels="[
          'label.oklab',
          'label.oklch',
        ]"
        :values="[
          oklab,
          oklchab,
        ]"
        :useInputs="true" />
    <div
      class="heading"
      v-html="getString('label.generic.other')"
    ></div>
  </div>
</template>

<style lang="scss">
.table-container {
  display: flex;
  flex-flow: column;
  align-items: center;
}

.heading {
  font-weight: 700;
  margin: 0.5em 0 0.25em 0;
}
</style>