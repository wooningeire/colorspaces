<script lang="ts" setup>
import { getCurrentInstance, nextTick, ref } from "vue";
import EntrySlider from "../input/EntrySlider.vue";
import { toHex, Option } from "@/util";
import { Node, InSocket } from "@/models/Node";
import { output } from "@/models/nodetypes";
import { settings } from "../store";
import * as cm from "@/models/colormanagement";
import ReadonlyInput from "./ReadonlyInput.vue";

const props = defineProps<{
  node: output.SampleHexCodesNode,
}>();

const proxy = getCurrentInstance()!.proxy!;


const nSegmentsX = ref(4);
const nSegmentsY = ref(4);

const hexString = (x: number, y: number): Option<string> => {
  if (!props.node.colorsSocket.hasLinks) return Option.None;

  const color = settings.deviceSpace.from(props.node.colorsSocket.inValue({
    coords: [
      nSegmentsX.value === 1 ? 0.5 : x / (nSegmentsX.value - 1),
      nSegmentsY.value === 1 ? 0.5 : y / (nSegmentsY.value - 1),
    ],
  }));
  
  if (!color.inGamut()) return Option.None;
  return Option.Some(`#${color.map(toHex).join("")}`);
};

const copyAll = async () => {
  const rows: string[] = [];
  for (let y = 0; y < nSegmentsY.value; y++) {
    const row: string[] = [];
    for (let x = 0; x < nSegmentsX.value; x++) {
      hexString(x, y).map(value => row.push(value));
    }
    rows.push(row.join(","));
  }

  try {
    await navigator.clipboard.writeText(rows.join("\n"));
  } catch (error) {}
};

defineExpose({
  reload: (requiresShaderReload: boolean, editedSocket: Node | InSocket | null) => {
    proxy.$forceUpdate();
  },
});
</script>

<template>
  <div class="container">
    <div class="fields">
      # segments X
      <EntrySlider
        v-model="nSegmentsX"
        :hasBounds="false"
        :min="1"
        :max="25"
        :step="1"
      />

      # segments Y
      <EntrySlider
        v-model="nSegmentsY"
        :hasBounds="false"
        :min="1"
        :max="25"
        :step="1"
      />
    </div>

    <div
      class="grid"
      :style="{
        '--n-cols': nSegmentsX,
        '--n-rows': nSegmentsY,
      }"
    >
      <template
        v-for="_, y of new Array(nSegmentsY)"
        :key="y"
      >
        <div
          v-for="_, x of new Array(nSegmentsX)"
          :key="x"
          :style="{
            '--x': x + 1,
            '--y': nSegmentsY - y,
            '--col': hexString(x, y).getElse('#0000'),
          }"
        >
          <ReadonlyInput
            :value="hexString(x, y).getElse('--')"
            cssWidth="8ch"
          />
        </div>
      </template>
    </div>

    <button @click="copyAll">Copy all</button>
  </div>
</template>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.fields {
  padding: 0 var(--socket-text-padding);
}

.grid {
  --n-cols: 1;
  --n-rows: 1;

  display: grid;
  grid-template-columns: repeat(var(--n-cols), 1fr);
  grid-template-rows: repeat(var(--n-rows), 1fr);

  border-radius: 0.5rem;
  overflow: hidden;

  > div {
    --x: 1;
    --y: 1;
    --col: #0000;

    grid-area: var(--y) / var(--x);
    display: grid;
    place-items: center;
    padding: 0.125rem;

    background-color: var(--col);
  }
}
</style>