<script lang="ts" setup>
import {computed, PropType, ref, watch} from "vue";

import {acceptAlways, identity} from "./base-functions";

import {Listen, clearTextSelection} from "@/util";

const props = defineProps({
	modelValue: {
		type: Number,
		required: true,
	},

	validate: {
		type: Function as PropType<<T>(proposedValue: T) => boolean>,
		default: acceptAlways,
	},

	convertIn: {
		type: Function as PropType<<T>(value: T) => T>,
		default: identity,
	},

	convertOut: {
		type: Function as PropType<<T>(value: T) => T>,
		default: identity,
	},

	min: {
		type: Number,
		default: 0,
	},
	
	max: {
		type: Number,
		default: 1,
	},

	step: {
		type: Number,
		default: 1e-2,
	},
});


const progress = computed(() => {
	const min = props.convertIn(props.min);
	const max = props.convertIn(props.max);
	const current = props.convertIn(props.modelValue);

	return (current - min) / (max - min);
});

const displayValue = ref(props.convertIn(props.modelValue).toString());


const proposedValueIsValid = ref(true);
const userIsInputing = ref(false);


const textbox = ref(null as HTMLInputElement | null);


const emit = defineEmits([
	"update:modelValue",
]);


const setDisplayToTrueValue = () => {
	displayValue.value = props.convertIn(props.modelValue).toString();
};


const onInput = () => {
	userIsInputing.value = true;
	const proposedValue = props.convertOut(Number(displayValue.value));

	proposedValueIsValid.value = props.validate(proposedValue);
	if (proposedValueIsValid.value) {
		emit("update:modelValue", proposedValue);
	}
};

const onChange = () => {
	userIsInputing.value = false;
	setDisplayToTrueValue();
	proposedValueIsValid.value = true;
};

const onBlur = () => {
	userIsInputing.value = false;
};

const dragTolerance = 4;

const beginSliderInput = (event: PointerEvent) => {
	const min = props.convertIn(props.min);
	const max = props.convertIn(props.max);
	const step = props.convertIn(props.step);

	const amountPerPixel = (max - min) / textbox.value!.offsetWidth;
	const input = event.currentTarget! as HTMLInputElement;

	let hasPassedTolerance = false;
	let displacementX = 0;

	const moveListener = Listen.for(input, "pointermove", (moveEvent: PointerEvent) => {
		clearTextSelection();

		displacementX += moveEvent.movementX;
		if (!hasPassedTolerance && Math.abs(displacementX) <= dragTolerance) {
			return;
		} else if (!hasPassedTolerance) {
			input.requestPointerLock();
			hasPassedTolerance = true;
		}

		// const newValue = (moveEvent.pageX - textbox.value!.getBoundingClientRect().left) * amountPerPixel;
		const newValue = props.modelValue + moveEvent.movementX * amountPerPixel;
		emit("update:modelValue", Math.round(newValue / step) * step);
	});

	addEventListener("pointerup", () => {
		clearTextSelection();
		moveListener.detach();

		document.exitPointerLock();
	}, {once: true});
};

const beginTextInput = (event: PointerEvent) => {
	userIsInputing.value = true;
	textbox.value!.select();
};

watch(() => props.modelValue, () => {
	if (userIsInputing.value) return;
	setDisplayToTrueValue();
});
</script>

<template>
	<input type="text"
			ref="textbox"
			v-model="displayValue"
			@input="onInput"
			@change="onChange"
			@pointerdown="event => !userIsInputing && beginSliderInput(event)"
			@click="event => !userIsInputing && beginTextInput(event)"
			@blur="onBlur"
			:class="{
				'invalid': !proposedValueIsValid,
				'inputing': userIsInputing,
			}"
			
			:style="{
				'--slider-progress': progress,
			} as any" />
</template>

<style lang="scss" scoped>
input {
	background: linear-gradient(90deg,
			var(--col-slider-progress) var(--slider-progress-pct),
			var(--col-slider-empty) var(--slider-progress-pct));
	border: none;
	color: inherit;

	margin-bottom: 0.25rem;
	border-radius: 4px;

	--slider-progress: 0;
	--slider-progress-pct: calc(var(--slider-progress) * 100%);

	--col-slider-progress: #ad4c64;
	--col-slider-empty: #555857;

	text-align: right;
	cursor: ew-resize;

	&:hover {
		--col-slider-progress: #dd4f96;
		--col-slider-empty: #666b69;
	}
	
	&.inputing {
		cursor: text;

		--col-slider-progress: #693333;
		--col-slider-empty: #3a3b3b;
	}

	&.invalid {
		color: var(--col-invalid-input);
	}
}
</style>