<script lang="ts" setup>
import {computed, onMounted, PropType, reactive, ref, watch, inject, Ref} from 'vue';

import makeDragListener from "../draggable";
import {settings} from '../store';

import {models} from "@/models/nodetypes";
import {Listen, clearTextSelection, lerp, clamp} from "@/util";
import * as cm from "@/models/colormanagement";

const props = defineProps({
  node: {
    type: models.SpectralPowerDistributionNode,
    required: true,
  },

  modelValue: {
    type: Array as PropType<number[]>,
    required: true,
  },

  datasetId: {
    type: String as PropType<"2deg" | "10deg">,
    required: true,
  },
});

const datasetIdRef = ref(props.datasetId);

const WIDTH = 830 - 360 + 1;
const HEIGHT = 81;

const emit = defineEmits<{
  (name: "update:datasetId", id: typeof props.datasetId): void,
}>();


const modelValue = reactive(props.modelValue);
watch(modelValue, () => props.node.flushCache());

const d = computed(() => `M0,0${modelValue.map((intensity, i) => `L${i},${intensity * HEIGHT}`).join("")}L${WIDTH},0`);



const svgContainer = ref(null as HTMLDivElement | null);


const spectrumCanvas = ref(null as HTMLCanvasElement | null);
const rerenderSpectrum = () => {
  const canvas = spectrumCanvas.value!;
  canvas.width = canvas.offsetWidth;

  const context = canvas.getContext("2d", {alpha: false})!;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < canvas.width; i++) {
    const wavelength = Math.round(lerp(360, 830, i / (canvas.width - 1)));

    const color = settings.deviceSpace.fromXyz(cm.singleWavelength(wavelength, props.datasetId));

    imageData.data[i*4] = color[0] * 255;
    imageData.data[i*4 + 1] = color[1] * 255;
    imageData.data[i*4 + 2] = color[2] * 255;
  }

  context.putImageData(imageData, 0, 0);
};
onMounted(rerenderSpectrum);
watch(settings, rerenderSpectrum);



const shouldClampMax = ref(true);
watch(shouldClampMax, () => {
  if (!shouldClampMax.value) return;
  Object.assign(modelValue, modelValue.map(intensity => clamp(intensity, 0, 1)));
});

const setBlack = () => {
  modelValue.fill(0);
};

const setWhite = () => {
  modelValue.fill(1);
};

const onchangeDatasetId = () => {
  props.node.flushCache();
  
  rerenderSpectrum();
  emit("update:datasetId", datasetIdRef.value);
};



const changeValue = (newPos: number[], lastPos: number[]) => {
  const x1 = Math.round(lastPos[0]);
  const x2 = Math.round(newPos[0]);

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  for (let x = minX; x <= maxX; x++) {
    if (0 > x || x > modelValue.length) continue;
    
    const lerpFac = (x - x1) / (x2 - x1);
    const newValue = isFinite(lerpFac) ? lerp(lastPos[1], newPos[1], lerpFac) : newPos[1];

    modelValue[x] = shouldClampMax.value
        ? clamp(newValue, 0, 1)
        : Math.max(0, newValue);
  }
};


const viewportScale = inject("treeViewportScale") as Ref<number>;

const beginInput = (downEvent: PointerEvent) => {
  if (downEvent.button !== 0) return;
  downEvent.stopPropagation();

  const rect = svgContainer.value!.getBoundingClientRect();

  const pos = (event: PointerEvent) => [
    (event.clientX - rect.left) / viewportScale.value,
    1 - (event.clientY - rect.top) / rect.height,
  ];

  let prevPos = pos(downEvent);
  changeValue(prevPos, prevPos);
  
  const moveListener = Listen.for(window, "pointermove", (moveEvent: PointerEvent) => {
    clearTextSelection();

    const newPos = pos(moveEvent);
    changeValue(newPos, prevPos);
    
    prevPos = newPos;
  });

  addEventListener("pointerup", () => {
    clearTextSelection();
    moveListener.detach();
  }, {once: true});
};
</script>

<template>
  <div class="graph-container">
    <div class="spectral-power-distribution-graph"
        @pointerdown="beginInput">
      <div ref="svgContainer">
        <svg :viewbox="`0 0 471 ${HEIGHT}`"
            :width="WIDTH"
            :height="HEIGHT">
          <path :d="d" />
        </svg>
      </div>

      <canvas class="chroma-reference"
          height="1"
          ref="spectrumCanvas"></canvas>

      <div class="wavelength-label">
        <div class="tickmark">360</div>
        <div>Wavelength (nm)</div>
        <div class="tickmark">830</div>
      </div>
    </div>

    <div class="controls">
      <div class="control-row">
        <div>
          <input type="checkbox"
              v-model="shouldClampMax" />
          <label>Limit maximum power</label>
        </div>

        <div>
          <button @click="setBlack"
              @pointerdown.stop>Black</button>
          <button @click="setWhite"
              @pointerdown.stop>White</button>
        </div>
      </div>

      <div class="control-row">
        <div>
          <label>Dataset</label>
          <select v-model="datasetIdRef"
              @change="onchangeDatasetId">
            <option value="2deg">CIE 2° observer (1931)</option>
            <option value="10deg">CIE 10° observer (1964)</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.graph-container {
  --spd-graph-padding: 1em;

  > .spectral-power-distribution-graph {
    display: flex;
    flex-flow: column;
    gap: 0.5em;

    padding: var(--spd-graph-padding);
    cursor: crosshair;

    svg {
      transform: scaleY(-1);

      path {
        fill: #ffffff3f;
        stroke: var(--node-border-color);
        stroke-width: 2;
        stroke-linejoin: round;
      }
    }

    > .chroma-reference {
      width: 100%;
      height: 1em;

      box-shadow: 0 0 0 2px var(--node-border-color);
    }
    
    > .wavelength-label {
      display: flex;
      flex-flow: row;
      justify-content: space-between;

      color: #ffffff7f;

      > .tickmark {
        font-family: var(--font-mono);
      }
    }
  }

  > .controls {
    display: flex;
    flex-flow: column;
    gap: 0.5em;

    padding: 0 var(--spd-graph-padding);

    > .control-row {
      display: flex;
      justify-content: space-between;

      > div {
        display: flex;
        flex-flow: row;
        gap: 0.25em;
      }
    }
  }
}
</style>