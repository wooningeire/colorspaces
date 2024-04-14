<script lang="ts" setup>
import {ref, computed, onBeforeUpdate, onUpdated, watchEffect, onMounted, watch, nextTick} from "vue";

import {Node, Socket, NodeEvalContext, InSocket, NodeUpdateSource} from "@/models/Node";
import {tree, settings} from "../store";
import { UniformReloadData, WebglVariables } from "@/webgl-compute/WebglVariables";

const props = withDefaults(defineProps<{
  node: Node,
  socket?: Socket | null,
  width?: number,
  height?: number,
  webglViewportWidth?: number,
  webglViewportHeight?: number,
  useSizeAsCanvasDimensions?: boolean,
}>(),{
  socket: null,
  width: 42,
  height: 42,
  webglViewportWidth: 1,
  webglViewportHeight: 1,
  useSizeAsCanvasDimensions: false,
});

const canvas = ref(null as HTMLCanvasElement | null);
// const cx = computed(() => canvas.value?.getContext("2d")!);
const glLast = computed(() => canvas.value?.getContext("webgl2"));
let glProgramLast: WebGLProgram;
let nVertsLast = 0;


const imageIsOutOfGamut = ref(false);

let lastTranspilation: WebglVariables;
let uniformReloadData: UniformReloadData;
const reinitializeShader = async () => {
  // canvas.value!.width = canvas.value!.offsetWidth * devicePixelRatio;
  // canvas.value!.height = canvas.value!.offsetWidth * devicePixelRatio;

  lastTranspilation = WebglVariables.transpileNodeOutput(props.node);
  // console.log(transpilation);

  const vertexShaderSource = `#version 300 es
in vec4 a_pos;

out vec2 v_uv;

void main() {
  gl_Position = a_pos;

  // Map [-1, 1] to [0, 1]
  v_uv = (a_pos.xy + 1.) / 2. * vec2(1., -1.);
}`;

  const fragmentShaderSource = lastTranspilation.template;
  // console.log(fragmentShaderSource);
  

  //#region Shader setup

  const gl = glLast.value!;

  const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);

  const glProgram = gl.createProgram()!;
  gl.attachShader(glProgram, vertexShader);
  gl.attachShader(glProgram, fragmentShader);
  gl.linkProgram(glProgram);

  gl.useProgram(glProgram);
  glProgramLast = glProgram;

  //#endregion


  //#region Setting attributes
  const vertArray = gl.createVertexArray();
  gl.bindVertexArray(vertArray);

  const vertCoords = new Float32Array([
    // Coordinates of the triangles that cover the canvas
    -1, -1,
    -1, 1,
    1, -1,

    -1, 1,
    1, -1,
    1, 1,
  ]);

  const COORD_DIMENSION = 2;
  const nVerts = vertCoords.length / COORD_DIMENSION;
  nVertsLast = nVerts;

  const vertBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertCoords, gl.STATIC_DRAW);

  const posAttr = gl.getAttribLocation(glProgram, "a_pos");
  gl.vertexAttribPointer(posAttr, COORD_DIMENSION, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(posAttr);
  //#endregion

  
  //#region Setting uniforms
  const outOfGamutAlphaUnif = gl.getUniformLocation(glProgram, "outOfGamutAlpha");
  setNonSocketUniforms = () => {
    gl.uniform1f(outOfGamutAlphaUnif, settings.outOfGamutAlpha);
  };
  //#endregion
  
  // gl.clearColor(0, 0, 0, 0);
  // gl.clear(gl.COLOR_BUFFER_BIT);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.bindVertexArray(vertArray);

  setNonSocketUniforms();
  rerender(true);
};
let setNonSocketUniforms: () => void;
const rerender = async (setUniforms: boolean, updateSource: NodeUpdateSource=NodeUpdateSource.TreeReload) => {
  await nextTick();

  if (!canvas.value) return;

  const gl = glLast.value!;

  let width: number;
  let height: number;
  const axes = props.node.getDependencyAxes();
  if (props.useSizeAsCanvasDimensions) {
    width = axes.has(0) ? props.width : 1;
    height = axes.has(1) ? props.height : 1;
  } else {
    const axes = props.node.getDependencyAxes();
    width = axes.has(0) ? canvas.value.offsetWidth * devicePixelRatio : 1;
    height = axes.has(1) ? canvas.value.offsetHeight * devicePixelRatio : 1;
  }
  canvas.value.width = width;
  canvas.value.height = height;
  gl.viewport(0, 0, width, height);

  if (setUniforms) {
    if (updateSource.isTreeReload()) {
      uniformReloadData = lastTranspilation.initializeUniforms(gl, glProgramLast);
    } else {
      lastTranspilation.refreshUniforms(gl, glProgramLast, updateSource, uniformReloadData);
    }
  }

  gl.drawArrays(gl.TRIANGLES, 0, nVertsLast);
};

// Performance bottleneck
/* 
const rerenderCanvas = () => {
  if (!canvas.value) return;

  let hasPixelOutOfGamut = false;

  const axes = props.node.getDependencyAxes();
  const width = canvas.value.width = axes.has(0) ? canvas.value.offsetWidth : 1;
  const height = canvas.value.height = axes.has(1) ? canvas.value.offsetHeight : 1;

  const imageData = cx.value.getImageData(0, 0, width, height);
  for (let xPixels = 0; xPixels < width; xPixels++) {
    const xFacFrac = (xPixels + 0.5) / width * props.imageWidth;

    for (let yPixels = 0; yPixels < height; yPixels++) {
      const yFacFrac = (yPixels + 0.5) / height * props.imageHeight;
  
      const colorData = dataOutput({coords: [xFacFrac, yFacFrac], socket: props.socket});
      if (!colorData) return; // Deals with extraneous call from watcher when nodes are deleted; not ideal

      const color = settings.deviceSpace.from(colorData);
      const inGamut = color.inGamut();

      const index = (xPixels + yPixels * imageData.width) * 4;

      if (!inGamut) {
        hasPixelOutOfGamut = true;
      }

      if (settings.displayOutOfGamut || inGamut) {
        imageData.data[index] = color[0] * 255;
        imageData.data[index + 1] = color[1] * 255;
        imageData.data[index + 2] = color[2] * 255;
        imageData.data[index + 3] = 255;
      } else {
        imageData.data[index + 3] = 0;
      }
    }
  }
  cx.value.putImageData(imageData, 0, 0);

  imageIsOutOfGamut.value = hasPixelOutOfGamut;
};
 */
onMounted(reinitializeShader);
watch(settings, () => {
  setNonSocketUniforms();
  rerender(false);
});

// `coords` property is needed to update when Gradient node axis changes, might want to make this check more robust?
// When is this check being triggered? (whenever function dependencies update according to Vue?)
// watch(() => dataOutput({socket: props.socket, coords: [0, 0]}), reinitializeShader);


defineExpose({
  reload: (requiresShaderReload: boolean, updateSource: NodeUpdateSource) => {
    if (requiresShaderReload) {
      reinitializeShader();
    } else {
      rerender(true, updateSource);
    }
  },
});
</script>

<template>
  <!-- <div class="color-display-box"
      v-if="nAxes === 0"
      :style="{
        'background': `rgb(${settings.deviceSpace.from(node.output(outputIndex, 0, 0)).map((x: number) => x * 255)})`,
      }"></div> -->

  <canvas class="color-display-box"
      :class="{
        'out-of-gamut': imageIsOutOfGamut,
      }"
      :style="{
        '--width': `${width}`,
        '--height': `${height}`,
      }"
      :title="imageIsOutOfGamut ? 'Colors are out of gamut of the device color space; it cannot accurately represent this color.' : ''"
      ref="canvas"
      width="1"
      height="1"></canvas>
</template>

<style lang="scss" scoped>
.color-display-box {
  // width: 3em;

  --width: 42;
  --height: 42;

  box-shadow: 0 0 0 2px var(--node-border-color);

  width: calc(var(--width) * 1px);
  aspect-ratio: var(--width) / var(--height);
  max-width: 100%;
  // height: calc(var(--height) * 1px);

  &.out-of-gamut {
    cursor: help;
    animation: pulsate-border 1.5s ease-in-out infinite alternate;

    @keyframes pulsate-border {
      0% {
        box-shadow: 0 0 0 2px #ef30af;
        background: #ef30af7f;
      }

      100% {
        box-shadow: 0 0 0 2px #5e2bd3;
        background: #5e2bd37f;
      }
    }
  }
}
</style>