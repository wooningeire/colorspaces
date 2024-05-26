<script lang="ts" setup>
import {PropType, computed, getCurrentInstance, ref, toValue} from 'vue';

import {settings} from "@/components/store";

import {Col} from "$/color-management/";
import {InSocket, SocketFlag} from '$/node/';
import NodeOutputTable from './NodeOutputTable.vue';
import { StringKey } from '$/strings';

const props = defineProps<{
  values: number[],
  labels: StringKey[],
  flags: SocketFlag[],
}>();

const nDecimals = 4;

// const labels = (props.values.constructor as typeof Col).labels;
// const isRgb = (props.values.constructor as typeof Col).isRgb;

const newValues = computed(() => props.values.map((value, i) => {
  const flag = i < props.flags.length ? props.flags[i] : SocketFlag.None;
  return (flag === SocketFlag.Rgb ? props.values[i] * settings.rgbScale
      : flag === SocketFlag.Hue ? props.values[i]  * settings.hueScale
      : props.values[i]
  ).toFixed(nDecimals);
}));
</script>

<template>
  <NodeOutputTable
    :labels="labels"
    :values="newValues"
  />
</template>