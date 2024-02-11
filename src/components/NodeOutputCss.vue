<script lang="ts" setup>
import { PropType, computed } from 'vue';
import NodeOutputTable from './NodeOutputTable.vue';
import { Color, clamp } from '@/util';

const props = defineProps({
    color: {
        type: Array as any as PropType<number[]>,
        required: true,
    },
});

const to255 = (channel: number) => Math.floor(clamp(channel, 0, 1) * 255);
const toHex = (channel: number) => to255(channel).toString(16).padStart(2, "0");
const toHex3 = (channel: number) => Math.floor(clamp(channel, 0, 1) * 15).toString(16);

const hex = computed(() => `#${props.color.map(toHex).join("")}`);
const hexa = computed(() => `${hex.value}ff`);
const hex3 = computed(() => `#${props.color.map(toHex3).join("")}`);
const hex3a = computed(() => `${hex3.value}f`);
const rgb = computed(() => `rgb(${props.color.map(to255).join(" ")})`);
const rgba = computed(() => `rgb(${props.color.map(to255).join(" ")} / 1)`);
const rgbLegacy = computed(() => `rgb(${props.color.map(to255).join(", ")})`);
const rgbaLegacy = computed(() => `rgba(${props.color.map(to255).join(", ")}, 1)`);
</script>

<template>
    <NodeOutputTable
            :labels="[
                'HEX',
                'HEXA',
                'HEX3',
                'HEX3A',
                'RGB',
                'RGBA',
                'RGB legacy',
                'RGBA legacy',
            ]"
            :values="[
                hex,
                hexa,
                hex3,
                hex3a,
                rgb,
                rgba,
                rgbLegacy,
                rgbaLegacy,
            ]" />
</template>