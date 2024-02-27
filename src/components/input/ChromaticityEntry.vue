<script lang="ts" setup>
import { InSocket, SocketType as St } from "@/models/Node";
import { output } from "@/models/nodetypes";
import {onMounted, ref, computed, onUpdated, watch, getCurrentInstance} from "vue";
import { settings, tree } from "../store";
import { ChromaticityPlotMode } from "@/models/nodetypes/output";
import * as cm from "@/models/colormanagement";


const props = defineProps<{
  node: output.ChromaticityPlotNode,
}>();


const dependencyAxes = ref(props.node.getDependencyAxes());
watch(tree.links, () => {
  dependencyAxes.value = props.node.getDependencyAxes();
  getCurrentInstance()?.proxy?.$forceUpdate();
});

const diagramScale = 1;
const nSamplesPerAxis = computed(() => {
  switch (dependencyAxes.value.size) {
    case 1: return 128;

    default:
    case 2: return 32;
  }
});
/** Samples an xy value from the input sockets (xy mode) */
const sampleInputXy = (coords: [number, number]) => (props.node.ins as InSocket<St.Float>[])
    .slice(1)
    .map(socket => socket.inValue({coords}));
/** Samples a color from the input sokcet (colors mode) */
const sampleInputColor = (coords: [number, number]) => (props.node.ins as InSocket<St.ColorCoords>[])[1]
    .inValue({coords});
/** The coordinates to sample from the input image/gradient/etc. */
const sampleCoords = computed(() => {
  let sampleCoords: [number, number][] = [[0, 0]];

  for (const axis of dependencyAxes.value) {
    const range = new Array(nSamplesPerAxis.value).fill(0).map((_, i) => i / (nSamplesPerAxis.value - 1));
    sampleCoords = sampleCoords.flatMap(coords =>
      range.map((_, i) => {
        const newCoords: [number, number] = [...coords];
        newCoords[axis] += range[i];
        return newCoords;
      }),
    );
  }

  return sampleCoords;
});

/** The sampled xy values from the input */
const sampledXys = computed(() => {
  if (props.node.overloadManager.mode === ChromaticityPlotMode.Xy) {
    return sampleCoords.value.map(coords => sampleInputXy(coords));
  }

  const colors = sampleCoords.value.map(coords => sampleInputColor(coords));
  if (colors[0] === undefined) {
    return [];
  }
  return colors.map(color => cm.Xyy.from(color, cm.illuminantsXy["2deg"]["E"]));
});

const canvas = ref<HTMLCanvasElement | null>(null);
onMounted(() => {
  canvas.value!.width = canvas.value!.offsetWidth * devicePixelRatio;
  canvas.value!.height = canvas.value!.offsetWidth * devicePixelRatio;


  const vertexShaderSource = `#version 300 es
in vec4 a_pos;

out vec2 v_xy;

void main() {
  gl_Position = a_pos;

  // Map [-1, 1] to [0, 1]
  v_xy = (a_pos.xy + 1.) / 2.;
}`;

  const fragmentShaderSource = `#version 300 es

precision mediump float;

in vec2 v_xy;
out vec4 fragColor;

uniform float alphaFac;
uniform bool detectGamut;

const float LUM = 1.;

const mat3 bradford = transpose(mat3(
   0.8951,  0.2664, -0.1614,
  -0.7502,  1.7135,  0.0367,
   0.0389, -0.0685,  1.0296
));

const vec2 illuminant2_D65 = vec2(0.31270, 0.32900);
const vec2 illuminant2_E = vec2(1./3., 1./3.);


vec3 xyyToXyz(vec3 xyy) {
  float x = xyy.x;
  float y = xyy.y;
  float lum = xyy.z;

  return y == 0.
      ? vec3(0., 0., 0.)
      : vec3(
        lum / y * x,
        lum,
        lum / y * (1. - x - y)
      );
}
vec3 xyzToXyy(vec3 xyz){
  float x = xyz.x;
  float y = xyz.y;
  float z = xyz.z;

  float dot1 = x + y + z;

  return dot1 == 0.
      ? vec3(0., 0., 0.)
      : vec3(
        x / dot1,
        y / dot1,
        y
      );
}

mat3 chromaticAdaptationMatrix(vec3 testWhiteXyz, vec3 refWhiteXyz, mat3 adaptationMatrix) {
  vec3 newTestWhiteXyz = adaptationMatrix * testWhiteXyz;
  vec3 newRefWhiteXyz = adaptationMatrix * refWhiteXyz;

  vec3 dotDivision = newRefWhiteXyz / newTestWhiteXyz;

  mat3 scalarMatrix = mat3(
    dotDivision.x, 0., 0.,
    0., dotDivision.y, 0.,
    0., 0., dotDivision.z
  );

  mat3 adaptationShifterMatrix = inverse(adaptationMatrix) * scalarMatrix;
  return adaptationShifterMatrix * adaptationMatrix;
}

vec3 adaptXyz(vec3 origXyz, vec2 originalIlluminant, vec2 targetIlluminant) {
  vec3 testWhiteXyz = xyyToXyz(vec3(originalIlluminant, 1.));
  vec3 refWhiteXyz = xyyToXyz(vec3(targetIlluminant, 1.));

  return chromaticAdaptationMatrix(testWhiteXyz, refWhiteXyz, bradford) * origXyz;
}

vec3 xyzToLinearSrgb(vec3 xyz, vec2 originalIlluminant) {
  vec3 adaptedXyz = adaptXyz(xyz, originalIlluminant, illuminant2_D65);

  //https://en.wikipedia.org/wiki/SRGB#From_CIE_XYZ_to_sRGB
  return transpose(mat3(
    +3.2404542, -1.5371385, -0.4985314,
    -0.9692660, +1.8760108, +0.0415560,
    +0.0556434, -0.2040259, +1.0572252
  )) * adaptedXyz;
}

/** Transfer function as defined by https://www.w3.org/Graphics/Color/srgb
 * 
 *  More precise constants as specified in https://en.wikipedia.org/wiki/SRGB
 */
float linearCompToGammaSrgb(float comp) {
  return comp <= 0.0031308
      ? 12.9232102 * comp
      : 1.055 * pow(comp, 1./2.4) - 0.055;
}

vec3 linearToGammaSrgb(vec3 linear) {
  return vec3(
    linearCompToGammaSrgb(linear.r),
    linearCompToGammaSrgb(linear.g),
    linearCompToGammaSrgb(linear.b)
  );
}


void main() {
  vec3 xyy = vec3(v_xy / ${diagramScale.toFixed(6)}, LUM);

  vec3 xyz = xyyToXyz(xyy);
  vec3 linearSrgb = xyzToLinearSrgb(xyz,illuminant2_E);
  vec3 gammaSrgb = linearToGammaSrgb(linearSrgb);

  bool outOfGamut = 0. > gammaSrgb.r
      || 0. > gammaSrgb.g
      || 0. > gammaSrgb.b;

  float alpha = detectGamut && outOfGamut
      ? 0.75
      : 1.;

  fragColor = vec4(gammaSrgb, alpha * alphaFac);
  // fragColor = vec4(gammaSrgb, 1.);
}`;


  //#region Shader setup

  const gl = canvas.value!.getContext("webgl2")!;

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

  const vertBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertCoords, gl.STATIC_DRAW);

  const posAttr = gl.getAttribLocation(glProgram, "a_pos");
  gl.vertexAttribPointer(posAttr, COORD_DIMENSION, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(posAttr);

  

  const vertArraySpectralLocus = gl.createVertexArray();
  gl.bindVertexArray(vertArraySpectralLocus);

  // Create a triangle fan with the spectral locus as vertices
  const vertsSpectralLocus = [];
  const baseVert = cm.Xyy.from(cm.singleWavelength(360, "2deg"));
  for (let i = 361; i < 830; i++) {
    const xyy0 = cm.Xyy.from(cm.singleWavelength(i, "2deg"));
    const xyy1 = cm.Xyy.from(cm.singleWavelength(i + 1, "2deg"));

    vertsSpectralLocus.push(
      baseVert[0] * 2 * diagramScale - 1, baseVert[1] * 2 * diagramScale - 1,
      xyy0[0] * 2 * diagramScale - 1, xyy0[1] * 2 * diagramScale - 1,
      xyy1[0] * 2 * diagramScale - 1, xyy1[1] * 2 * diagramScale - 1,
    );
  }
  const vertCoordsSpectralLocus = new Float32Array(vertsSpectralLocus);

  const nVertsSpectralLocus = vertCoordsSpectralLocus.length / COORD_DIMENSION;

  const vertBufferSpectralLocus = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertBufferSpectralLocus);
  gl.bufferData(gl.ARRAY_BUFFER, vertCoordsSpectralLocus, gl.STATIC_DRAW);

  const posAttrSpectralLocus = gl.getAttribLocation(glProgram, "a_pos");
  gl.vertexAttribPointer(posAttrSpectralLocus, COORD_DIMENSION, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(posAttrSpectralLocus);

  //#endregion


  //#region Setting uniforms
  const alphaUnif = gl.getUniformLocation(glProgram, "alphaFac");
  const detectGamutUnif = gl.getUniformLocation(glProgram, "detectGamut");
  //#endregion
  
  // gl.clearColor(0, 0, 0, 0);
  // gl.clear(gl.COLOR_BUFFER_BIT);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.bindVertexArray(vertArray);
  gl.uniform1f(alphaUnif, 0.25);
  gl.uniform1i(detectGamutUnif, 0);
  gl.drawArrays(gl.TRIANGLES, 0, nVerts);

  gl.bindVertexArray(vertArraySpectralLocus);
  gl.uniform1f(alphaUnif, 1);
  gl.uniform1i(detectGamutUnif, 1);
  gl.drawArrays(gl.TRIANGLES, 0, nVertsSpectralLocus);
});

// Performance bottleneck
const rerenderCanvas = () => {
  if (!canvas.value) return;

  // let hasPixelOutOfGamut = false;

  // const width = 140;
  // const height = 140;

  // const imageData = cx.value.getImageData(0, 0, width, height);
  // for (let xPixels = 0; xPixels < width; xPixels++) {
  //     const xFacFrac = (xPixels + 0.5) / width;

  //     for (let yPixels = 0; yPixels < height; yPixels++) {
  //         const yFacFrac = (yPixels + 0.5) / height;
  
  //         const colorData = new Xyy([xFacFrac, yFacFrac, 0.5]);
  //         if (!colorData) return; // Deals with extraneous call from watcher when nodes are deleted; not ideal

  //         const color = settings.deviceSpace.from(colorData);
  //         const inGamut = color.inGamut();

  //         const index = (xPixels + yPixels * imageData.width) * 4;

  //         if (inGamut) {
  //             imageData.data[index] = color[0] * 255;
  //             imageData.data[index + 1] = color[1] * 255;
  //             imageData.data[index + 2] = color[2] * 255;
  //             imageData.data[index + 3] = 255;
  //         } else {
  //             imageData.data[index + 3] = 0;
  //         }
  //     }
  // }
  // cx.value.putImageData(imageData, 0, 0);
};

onMounted(rerenderCanvas);
onUpdated(rerenderCanvas);
watch(settings, rerenderCanvas);
</script>

<template>
  <div class="chromaticity-viewer">
    <canvas ref="canvas"></canvas>
    <svg class="point-container"
        viewBox="0 0 1 1">
      <g transform="translate(0, 1) scale(1, -1)">
        <circle v-for="xy of sampledXys"
            :cx="xy[0] * diagramScale"
            :cy="xy[1] * diagramScale"
            r="0.0125"
            class="point" />
      </g>
    </svg>
  </div>
</template>

<style lang="scss">
.chromaticity-viewer {
  display: grid;
  overflow: hidden;
  padding: 0.5em;

  > * {
    grid-area: 1/1;
    max-width: 100%;
  }

  > canvas {
    border-radius: 0.5em;
  }

  > .point-container {    
    position: relative;
    overflow: visible;
    mix-blend-mode: difference;

    .point {
      --color: #fff;

      // transition: cx 0.125s cubic-bezier(0, 0.74, 0.36, 1),
      //     cy 0.125s cubic-bezier(0, 0.74, 0.36, 1);

      fill: var(--color);
    }
  }
}
</style>