<script lang="ts" setup>
import {ref, computed, onBeforeUpdate, onUpdated, watchEffect, onMounted, watch} from "vue";

import {Node, Socket, NodeEvalContext} from "@/models/Node";
import {externals} from "@/models/nodetypes";
import * as cm from "@/models/colormanagement";
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


// Performance bottleneck
const rerenderCanvas = () => {
	if (!canvas.value) return;

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

watch(() => dataOutput({socket: props.socket}), rerenderCanvas);


const nAxes = computed(() => props.node.getDependencyAxes().size);
</script>

<template>
	<!-- <div class="color-display-box"
			v-if="nAxes === 0"
			:style="{
				'background': `rgb(${settings.deviceSpace.from(node.output(outputIndex, 0, 0)).map((x: number) => x * 255)})`,
			}"></div> -->

	<canvas class="color-display-box"
			ref="canvas"
			width="1"
			height="1"></canvas>
</template>

<style lang="scss">
.color-display-box {
	width: 3em;

	box-shadow: 0 0 0 2px var(--node-border-color);
}</style>