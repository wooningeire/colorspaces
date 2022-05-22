<script lang="ts" setup>
import {ref, computed, onBeforeUpdate, onUpdated, watchEffect, onMounted, watch} from "vue";

import {externals} from "@/models/nodetypes";

const props = defineProps({
	node: {
		type: externals.DeviceTransformNode,
		required: true,
	},

	outputIndex: {
		type: Number,
		required: true,
	},
});

const canvas = ref(null as any as HTMLCanvasElement);
const cx = computed(() => canvas.value.getContext("2d")!);

const rerenderCanvas = () => {
	const width = canvas.value.width;

	const imageData = cx.value.getImageData(0, 0, width, 1);
	for (let i = 0; i < width; i++) {
		const facFrac = i / (width - 1);
		const color = props.node.output(facFrac)[props.outputIndex];
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

watch(() => props.node.output(), () => {
	rerenderCanvas();
});
</script>

<template>
	<div class="color-display-box"
			v-if="false"
			:style="{
				'background': `rgb(${node.output(0.5)[outputIndex].map(x => x * 255)})`,
			}"></div>

	<canvas class="color-display-box"
			v-else
			ref="canvas"
			height="1"></canvas>
</template>

