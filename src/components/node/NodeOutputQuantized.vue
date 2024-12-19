<script lang="ts" setup>
import { computed, getCurrentInstance, nextTick, ref } from "vue";
import { toHex, Option, clamp } from "$/util";
import { output } from "$/node-types";
import { settings } from "@/components/store.svelte";
import ReadonlyInput from "./ReadonlyInput.vue";
import { NodeEvalContext } from "$/node/";

const props = defineProps<{
  node: output.SampleHexCodesNode,
}>();

const proxy = getCurrentInstance()!.proxy!;


const nSegmentsX = computed(() => Math.max(0, props.node.nSegmentsXSocket.inValue()));
const nSegmentsY = computed(() => Math.max(0, props.node.nSegmentsYSocket.inValue()));

const hexString = (x: number, y: number): Option<string> => {
  if (!props.node.colorsSocket.hasLinks) return Option.None;

  const context: NodeEvalContext = {
    coords: [x, y],
  };

  const scaleX = props.node.scaleXSocket.inValue(context);
  const fitRangeX = props.node.fitRangeXSocket.inValue(context);
  const scaleY = props.node.scaleYSocket.inValue(context);
  const fitRangeY = props.node.fitRangeYSocket.inValue(context);

  const xQuantized = nSegmentsX.value === 1 ? 0.5 : x * scaleX / (nSegmentsX.value - (fitRangeX ? 1 : 0));
  const yQuantized = nSegmentsY.value === 1 ? 0.5 : y * scaleY / (nSegmentsY.value - (fitRangeY ? 1 : 0));

  const color = settings.deviceSpace.from(props.node.colorsSocket.inValue({
    coords: [xQuantized, yQuantized],
  }));
  
  if (!color.inGamut()) {
    return props.node.clampSocket.inValue()
        ? Option.Some(`#${color.map(value => clamp(value, 0, 1)).map(toHex).join("")}${toHex(settings.outOfGamutAlpha)}`)
        : Option.None;
  }
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
  reload: () => {
    proxy.$forceUpdate();
  },
});
</script>

<template>
  <div class="container">
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
            :value="hexString(x, y).map(str => str.slice(0, 7)).getElse('--')"
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
  width: 100%;
  margin: 0 var(--socket-text-padding);
}

.grid {
  --n-cols: 1;
  --n-rows: 1;

  display: grid;
  grid-template-columns: repeat(var(--n-cols), 1fr);
  grid-template-rows: repeat(var(--n-rows), 1fr);

  border-radius: var(--node-widget-border-radius);
  overflow-x: auto;

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