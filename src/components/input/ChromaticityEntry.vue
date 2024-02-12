<script lang="ts" setup>
import { Socket, SocketType as St } from "@/models/Node";
import { output } from "@/models/nodetypes";
import {onMounted, ref, computed, onUpdated, watch, PropType} from "vue";
import { settings } from "../store";


const props = defineProps({
	node: {
		type: output.ChromaticityPlotNode,
		required: true,
	},
});


const xy = computed(() => (props.node.ins as Socket<St.Float>[])
        .map(socket => socket.inValue({coords: [0, 0]})));

const canvas = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
    canvas.value!.width = canvas.value!.offsetWidth;
    canvas.value!.height = canvas.value!.offsetWidth;


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

vec3 adaptXyz(vec3 origXyz, vec2 targetIlluminant) {
    vec3 testWhiteXyz = xyyToXyz(vec3(illuminant2_E, 1.));
    vec3 refWhiteXyz = xyyToXyz(vec3(targetIlluminant, 1.));

    return chromaticAdaptationMatrix(testWhiteXyz, refWhiteXyz, bradford) * origXyz;
}

vec3 xyzToLinearSrgb(vec3 xyz) {
	vec3 adaptedXyz = adaptXyz(xyz, illuminant2_D65);

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
    vec3 xyy = vec3(v_xy, LUM);

    vec3 xyz = xyyToXyz(xyy);
    vec3 linearSrgb = xyzToLinearSrgb(xyz);
    vec3 gammaSrgb = linearToGammaSrgb(linearSrgb);

    bool outOfGamut = 0. > gammaSrgb.r || gammaSrgb.r > 1.
            || 0. > gammaSrgb.g || gammaSrgb.g > 1.
            || 0. > gammaSrgb.b || gammaSrgb.b > 1.;

    // fragColor = vec4(gammaSrgb, outOfGamut ? 0.25 : 1.);
    fragColor = vec4(gammaSrgb, 1.);
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

    //#endregion
    
    // gl.clearColor(0, 0, 0, 0);
    // gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLES, 0, nVerts);
});

// Performance bottleneck
const rerenderCanvas = () => {
	if (!canvas.value) return;

	// let hasPixelOutOfGamut = false;

	// const width = 140;
	// const height = 140;

	// const imageData = cx.value.getImageData(0, 0, width, height);
	// for (let xPixels = 0; xPixels < width; xPixels++) {
	// 	const xFacFrac = (xPixels + 0.5) / width;

	// 	for (let yPixels = 0; yPixels < height; yPixels++) {
	// 		const yFacFrac = (yPixels + 0.5) / height;
	
	// 		const colorData = new Xyy([xFacFrac, yFacFrac, 0.5]);
	// 		if (!colorData) return; // Deals with extraneous call from watcher when nodes are deleted; not ideal

	// 		const color = settings.deviceSpace.from(colorData);
	// 		const inGamut = color.inGamut();

	// 		const index = (xPixels + yPixels * imageData.width) * 4;

	// 		if (inGamut) {
	// 			imageData.data[index] = color[0] * 255;
	// 			imageData.data[index + 1] = color[1] * 255;
	// 			imageData.data[index + 2] = color[2] * 255;
	// 			imageData.data[index + 3] = 255;
	// 		} else {
	// 			imageData.data[index + 3] = 0;
	// 		}
	// 	}
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
        <div class="point-container">
            <div class="point"
                    :style="{
                        '--x': xy[0],
                        '--y': xy[1],
                    } as any">

            </div>
        </div>
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

    > .point-container {    
        position: relative;

        > .point {
            position: absolute;
            left: calc(var(--x) * 100%);
            bottom: calc(var(--y) * 100%);

            --point-size: 8px;

            width: var(--point-size);
            height: var(--point-size);
            transform: translate(calc(-1 * var(--point-size) / 2), calc(var(--point-size) / 2));
            border: 2px solid #fff;
            border-radius: 50%;

            // transition: bottom 0.125s cubic-bezier(0, 0.74, 0.36, 1),
            //        left 0.125s cubic-bezier(0, 0.74, 0.36, 1);

            mix-blend-mode: difference;
        }
    }
}
</style>