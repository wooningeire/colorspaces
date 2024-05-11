<script lang="ts" setup>
import { Link, Socket } from "@/models/Node";
import {computed, getCurrentInstance, inject, nextTick, onBeforeUpdate, onMounted, onUpdated, ref} from "vue";

const props = withDefaults(defineProps<{
    link?: Link | null,
  socketVues: WeakMap<Socket, any>,

  x0?: number,
  y0?: number,
  x1?: number,
  y1?: number,

    subtle?: boolean,
    invalid?: boolean,
}>(), {
  link: null,

    subtle: false,
    invalid: false,
  
  x0: 0,
  y0: 0,
  x1: 0,
  y1: 0,
});


const socketVue = (socket: Socket) => props.socketVues.get(socket);
const srcX = ref();
const srcY = ref();
const dstX = ref();
const dstY = ref();

const socketLoaded = ref(false);
const checkSocketLoaded = () => {
  if ([srcX.value, srcY.value, dstX.value, dstY.value].includes(undefined)) {
    nextTick(checkSocketLoaded);
  } else {
    socketLoaded.value = true;
  }
}
const linkVues = inject<WeakMap<Link, any>>("linkVues")!;
onMounted(() => {
  checkSocketLoaded();

  // This component is force-updated by TheNodeTree when a socket moves
  if (props.link) {
    linkVues.set(props.link, getCurrentInstance()?.proxy);
  }
  setCoords();
});

onBeforeUpdate(() => {
  setCoords();
});

const setCoords = () => {
  srcX.value = props.link ? socketVue(props.link.src)?.socketPos()[0] : props.x0;
  srcY.value = props.link ? socketVue(props.link.src)?.socketPos()[1] : props.y0;
  dstX.value = props.link ? socketVue(props.link.dst)?.socketPos()[0] : props.x1;
  dstY.value = props.link ? socketVue(props.link.dst)?.socketPos()[1] : props.y1;
};



const path = computed(() => {
  const [x0, y0, x1, y1] = [srcX.value, srcY.value, dstX.value, dstY.value];

  const controlPointDx = 8 * (((x1! - x0!) ** 2 + 16 ** 2) ** (1/4));

  return `M${x0},${y0}
C${x0! + controlPointDx},${y0} ${x1! - controlPointDx},${y1}, ${x1},${y1}`;
});
</script>

<template>
  <path
    v-if="socketLoaded"
    :d="path"
    
    :class="{
      subtle,
      invalid,
    }"
  />
</template>

<style lang="scss" scoped>
path {
  --dasharray-length: -22px;

  fill: none;

  transition:
      stroke .25s ease-in-out,
      stroke-dasharray .5s ease-in-out;

  animation: move-stroke 0.5s infinite linear;

  stroke-dasharray: 20px 2px;

  @keyframes move-stroke {
    0% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: var(--dasharray-length);
    }
  }

  &.subtle {
    opacity: 0.25;
  }

  &.invalid {
    --dasharray-length: -8px;

    stroke: #f68;
    stroke-dasharray: 4px;
  }
}
</style>