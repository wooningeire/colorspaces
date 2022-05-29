<script lang="ts" setup>
import { computed, PropType, reactive } from 'vue';

import makeDragListener from "../draggable";

import {Listen, clearTextSelection, lerp, clamp} from "@/util";

const props = defineProps({
	modelValue: {
		type: Array as PropType<number[]>,
		default: Array(830 - 360 + 1).fill(0),
	},
});

const HEIGHT = 81;


const tempValue = reactive(props.modelValue);

const d = computed(() => `M 0,0 ${tempValue.map((intensity, i) => `L ${i},${intensity * HEIGHT}`).join(" ")} L 471,0`);


const changeValue = (newPos: number[], lastPos: number[]) => {
	const minX = Math.min(lastPos[0], newPos[0]);
	const maxX = Math.max(lastPos[0], newPos[0]);

	for (let x = minX; x <= maxX; x++) {
		if (0 > x || x > tempValue.length) continue;
		
		const lerpFac = (x - lastPos[0]) / (newPos[0] - lastPos[0]);
		const newValue = isNaN(lerpFac) ? newPos[1] : lerp(lastPos[1], newPos[1], lerpFac);

		tempValue[x] = Math.max(0, newValue); //clamp(newValue, 0, 1);
	}
};

const beginInput = (downEvent: PointerEvent) => {
	const element = downEvent.currentTarget! as HTMLDivElement;
	const rect = element.getBoundingClientRect();

	let prevPos = [
		downEvent.clientX - rect.left,
		1 - (downEvent.clientY - rect.top) / rect.height,
	];

	changeValue(prevPos, prevPos);
	
	const moveListener = Listen.for(window, "pointermove", (moveEvent: PointerEvent) => {
		clearTextSelection();

		const newPos = [
			moveEvent.clientX - rect.left,
			1 - (moveEvent.clientY - rect.top) / rect.height,
		];

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
	<div @pointerdown.stop="beginInput">
		<svg :viewbox="`0 0 471 ${HEIGHT}`"
				width="471"
				:height="HEIGHT">
			<path :d="d" />
		</svg>
	</div>
</template>

<style lang="scss" scoped>
svg {
	cursor: crosshair;
	transform: scaleY(-1);

	path {
		fill: #ffffff3f;
		stroke: var(--node-border-color);
		stroke-width: 2;
	}
}
</style>