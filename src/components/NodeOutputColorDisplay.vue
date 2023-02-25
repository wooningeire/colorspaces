<script lang="ts" setup>
import {ref, computed, onBeforeUpdate, onUpdated, watchEffect, onMounted, watch} from "vue";

import {Node, Socket, NodeEvalContext} from "@/models/Node";
import {tree, settings} from "./store";

const props = defineProps({
	node: {
		type: Node,
		required: true,
	},

	socket: {
		type: Socket,
		default: null,
	},
});

const canvas = ref(null as HTMLCanvasElement | null);
const cx = computed(() => canvas.value?.getContext("2d")!);


const dataOutput = (context: NodeEvalContext) => props.node.output(context);

const imageIsOutOfGamut = ref(false);

// Performance bottleneck
const rerenderCanvas = () => {
	if (!canvas.value) return;

	let hasPixelOutOfGamut = false;

	const axes = props.node.getDependencyAxes();
	const width = canvas.value.width = axes.has(0) ? canvas.value.offsetWidth : 1;
	const height = canvas.value.height = axes.has(1) ? canvas.value.offsetHeight : 1;

	const imageData = cx.value.getImageData(0, 0, width, height);
	for (let xPixels = 0; xPixels < width; xPixels++) {
		const xFacFrac = (xPixels + 0.5) / width;

		for (let yPixels = 0; yPixels < height; yPixels++) {
			const yFacFrac = (yPixels + 0.5) / height;
	
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

onMounted(rerenderCanvas);
onUpdated(rerenderCanvas);
watch(settings, rerenderCanvas);

// `coords` property is needed to update when Gradient node axis changes, might want to make this check more robust?
// When is this check being triggered? (whenever function dependencies update according to Vue?)
watch(() => dataOutput({socket: props.socket, coords: [0, 0]}), rerenderCanvas);


const nAxes = computed(() => props.node.getDependencyAxes().size);
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
			:title="imageIsOutOfGamut ? 'Colors are out of gamut of the device color space; it cannot accurately represent this color.' : ''"
			ref="canvas"
			width="1"
			height="1"></canvas>
</template>

<style lang="scss">
.color-display-box {
	width: 3em;

	box-shadow: 0 0 0 2px var(--node-border-color);

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