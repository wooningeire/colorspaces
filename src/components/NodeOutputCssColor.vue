<script lang="ts" setup>
import { PropType, computed } from 'vue';
import NodeOutputTable from './NodeOutputTable.vue';
import { Color, Vec3, clamp } from '@/util';
import * as cm from '@/models/colormanagement';

const props = defineProps<{
    color?: cm.Col,
}>();

const to255 = (channel: number) => Math.round(clamp(channel, 0, 1) * 255);
const toHex = (channel: number) => to255(channel).toString(16).padStart(2, "0");
const toHex3 = (channel: number) => Math.round(clamp(channel, 0, 1) * 15).toString(16);

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

const lab = computed(() => props.color ? `lab(${labStrings(props.color, color => cm.Lab.from(color)).join(" ")})` : "--");
const lchab = computed(() => props.color ? `lch(${labStrings(props.color, color => cm.LchAb.from(color)).join(" ")})` : "--");

const oklab = computed(() => props.color ? `oklab(${oklabStrings(props.color, color => cm.Oklab.from(color)).join(" ")})` : "--");
const oklchab = computed(() => props.color ? `oklch(${oklabStrings(props.color, color => cm.OklchAb.from(color)).join(" ")})` : "--");
</script>

<template>
    <div class="table-container">
        <div class="heading">sRGB</div>
        <NodeOutputTable
                :labels="[
                    'HEX',
                    'HEX3',
                    'RGB',
                    'HSL',
                    'HWB',
                    'RGB legacy',
                    'HSL legacy',
                ]"
                :values="[
                    hex,
                    hex3,
                    rgb,
                    hsl,
                    hwb,
                    rgbLegacy,
                    hslLegacy,
                ]" />

        <div class="heading">CIELAB</div>
        <NodeOutputTable
                :labels="[
                    'L*a*b*',
                    'L*C*h',
                ]"
                :values="[
                    lab,
                    lchab,
                ]" />
        <div class="heading">Oklab</div>
        <NodeOutputTable
                :labels="[
                    'oklab',
                    'oklch',
                ]"
                :values="[
                    oklab,
                    oklchab,
                ]" />
        <div class="heading">Other</div>
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