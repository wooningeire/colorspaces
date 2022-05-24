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

const canvas = ref(null as any as HTMLCanvasElement);
const cx = computed(() => canvas.value.getContext("2d")!);


// TODO decouple
const dataOutput = (...args: number[]) => props.node instanceof externals.DeviceTransformNode
		? props.node.output(props.outputIndex!, ...args)
		: props.node.output(...args);


const rerenderCanvas = () => {
	const width = canvas.value.width;

	const imageData = cx.value.getImageData(0, 0, width, 1);
	for (let i = 0; i < width; i++) {
		const facFrac = i / (width - 1);
		const color = cm.Srgb.from(dataOutput(facFrac, 0));
		if (!color) return; // Deals with extraneous call from watcher when nodes are deleted; not ideal

		imageData.data[i*4] = color[0] * 255;
		imageData.data[i*4 + 1] = color[1] * 255;
		imageData.data[i*4 + 2] = color[2] * 255;
		imageData.data[i*4 + 3] = 255;
	}
	cx.value.putImageData(imageData, 0, 0);
};

onMounted(() => {
	canvas.value.width = canvas.value.offsetWidth;
	rerenderCanvas();
});

onUpdated(rerenderCanvas);

watch(dataOutput, () => {
	rerenderCanvas();
});


const nAxes = computed(() => 1);
</script>

<template>
	<div class="color-display-box"
			v-if="nAxes === 0"
			:style="{
				'background': `rgb(${node.output(outputIndex, 0.5).map((x: number) => x * 255)})`,
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