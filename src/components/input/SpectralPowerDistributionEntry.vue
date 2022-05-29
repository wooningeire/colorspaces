<script lang="ts" setup>
import { computed, onMounted, PropType, reactive, ref, watch } from 'vue';

import makeDragListener from "../draggable";

import {Listen, clearTextSelection, lerp, clamp} from "@/util";
import * as cm from "@/models/colormanagement";

const props = defineProps({
	modelValue: {
		type: Array as PropType<number[]>,
		default: Array(830 - 360 + 1).fill(0),
	},
});

const HEIGHT = 81;


const modelValue = reactive(props.modelValue);

const d = computed(() => `M 0,0 ${modelValue.map((intensity, i) => `L ${i},${intensity * HEIGHT}`).join(" ")} L 471,0`);



const svgContainer = ref(null as HTMLDivElement | null);


const chromaReferenceCanvas = ref(null as HTMLCanvasElement | null);
onMounted(() => {
	const canvas = chromaReferenceCanvas.value!;
	canvas.width = canvas.offsetWidth;

	const context = canvas.getContext("2d", {alpha: false})!;

	const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

	for (let i = 0; i < canvas.width; i++) {
		const wavelength = Math.round(lerp(360, 830, i / (canvas.width - 1)));

		const color = cm.Srgb.fromXyz(cm.singleWavelength(wavelength));

		imageData.data[i*4] = color[0] * 255;
		imageData.data[i*4 + 1] = color[1] * 255;
		imageData.data[i*4 + 2] = color[2] * 255;
	}

	context.putImageData(imageData, 0, 0);
});



const shouldClampMax = ref(true);
watch(shouldClampMax, () => {
	Object.assign(modelValue, modelValue.map(intensity => clamp(intensity, 0, 1)));
});

const setBlack = () => {
	modelValue.fill(0);
};

const setWhite = () => {
	modelValue.fill(1);
};



const changeValue = (newPos: number[], lastPos: number[]) => {
	const minX = Math.min(lastPos[0], newPos[0]);
	const maxX = Math.max(lastPos[0], newPos[0]);

	for (let x = minX; x <= maxX; x++) {
		if (0 > x || x > modelValue.length) continue;
		
		const lerpFac = (x - lastPos[0]) / (newPos[0] - lastPos[0]);
		const newValue = isNaN(lerpFac) ? newPos[1] : lerp(lastPos[1], newPos[1], lerpFac);

		modelValue[x] = shouldClampMax.value
				? clamp(newValue, 0, 1)
				: Math.max(0, newValue);
	}
};

const beginInput = (downEvent: PointerEvent) => {
	const rect = svgContainer.value!.getBoundingClientRect();

	const pos = (event: PointerEvent) => [
		event.clientX - rect.left,
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
				@pointerdown.stop="beginInput">
			<div ref="svgContainer">
				<svg :viewbox="`0 0 471 ${HEIGHT}`"
						width="471"
						:height="HEIGHT">
					<path :d="d" />
				</svg>
			</div>

			<canvas class="chroma-reference"
					height="1"
					ref="chromaReferenceCanvas"></canvas>

			<div class="wavelength-label">
				<div class="tickmark">360</div>
				<div>Wavelength (nm)</div>
				<div class="tickmark">830</div>
			</div>
		</div>

		<div class="controls">
			<div>
				<input type="checkbox"
						v-model="shouldClampMax" />
				<label>Limit maximum power</label>
			</div>

			<div>
				<button @click="setBlack">Black</button>
				<button @click="setWhite">White</button>
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
		justify-content: space-between;

		padding: 0 var(--spd-graph-padding);

		> div {
			display: flex;
			flex-flow: row;
			gap: 0.25em;
		}
	}
}
</style>