<script lang="ts" setup>
import {ref, computed, onBeforeUpdate, onUpdated, watchEffect, onMounted, watch} from "vue";

import {Node} from "@/models/Node";
import {externals} from "@/models/nodetypes";
import * as cm from "@/models/colormanagement";

const props = defineProps({
	node: {
		type: Node,
		required: true,
	},

	outputIndex: {
		type: Number,
	},
});

const canvas = ref(null as HTMLCanvasElement | null);
const cx = computed(() => canvas.value?.getContext("2d")!);


// TODO decouple
const dataOutput = (...args: number[]) => props.node instanceof externals.DeviceTransformNode
		? props.node.output(props.outputIndex!, ...args)
		: props.node.output(...args);


// Performance bottleneck
const rerenderCanvas = () => {
	if (!canvas.value) return;

	const axes = props.node.getDependencyAxes();
	const width = canvas.value.width = axes.has(0) ? canvas.value.offsetWidth : 1;
	const height = canvas.value.height = axes.has(1) ? canvas.value.offsetHeight : 1;

	const imageData = cx.value.getImageData(0, 0, width, height);
	for (let xPixels = 0; xPixels < width; xPixels++) {
		const xFacFrac = xPixels / (width - 1);

		for (let yPixels = 0; yPixels < height; yPixels++) {
			const yFacFrac = yPixels / (height - 1);
	
			const colorData = dataOutput(xFacFrac, yFacFrac);
			if (!colorData) return; // Deals with extraneous call from watcher when nodes are deleted; not ideal

			const color = cm.Srgb.from(colorData);

			const index = (xPixels + yPixels * imageData.width) * 4;

			imageData.data[index] = color[0] * 255;
			imageData.data[index + 1] = color[1] * 255;
			imageData.data[index + 2] = color[2] * 255;
			imageData.data[index + 3] = 255;
		}
	}
	cx.value.putImageData(imageData, 0, 0);
};

onMounted(rerenderCanvas);
onUpdated(rerenderCanvas);

watch(dataOutput, rerenderCanvas);


const nAxes = computed(() => props.node.getDependencyAxes().size);
</script>

<template>
	<div class="color-display-box"
			v-if="nAxes === 0"
			:style="{
				'background': `rgb(${cm.Srgb.from(node.output(outputIndex, 0, 0)).map((x: number) => x * 255)})`,
			}"></div>

	<canvas class="color-display-box"
			v-else
			ref="canvas"
			height="1"></canvas>
</template>

<style lang="scss">
.color-display-box {
	width: 3em;

	box-shadow: 0 0 0 2px var(--node-border-color);
}</style>