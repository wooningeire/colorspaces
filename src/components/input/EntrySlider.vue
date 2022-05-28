<script lang="ts" setup>
import {computed, PropType, ref, watch} from "vue";

import {acceptAlways, identity} from "./base-functions";
import {modifierKeys} from "../store";
import makeDragListener from "../draggable";

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

	hasBounds: {
		type: Boolean,
		default: true,
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
		default: 1e-3,
	},

	nDecimals: {
		type: Number,
		default: 3,
	},

	unboundedChangePerPixel: {
		type: Number,
		default: 0.03125,
	},
});


const sliderMin = computed(() => props.convertIn(props.min));
const sliderMax = computed(() => props.convertIn(props.max));
const sliderStep = computed(() => props.convertIn(props.step));
const sliderCurrent = computed(() => props.convertIn(props.modelValue));

const progress = computed(() => (sliderCurrent.value - sliderMin.value) / (sliderMax.value - sliderMin.value));


const amountPerPixel = computed(() => (sliderMax.value - sliderMin.value) / textbox.value!.offsetWidth);


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

const roundToStep = (value: number, step: number) => Math.round(value / step) * step;

const beginSliderInput = makeDragListener({
	onPassTolerance(downEvent) {
		(downEvent.target! as HTMLInputElement).requestPointerLock();
	},

	onDrag(moveEvent) {
		const fac =
				modifierKeys.shift ? 1/8 :
				modifierKeys.ctrl ? 8 :
				1;
	
		const newValue = props.modelValue + moveEvent.movementX * amountPerPixel.value * fac;
		emit("update:modelValue", Number(roundToStep(newValue, props.step).toFixed(props.nDecimals)));
	},

	onUp() {
		document.exitPointerLock();
	},
});

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
			@click="event => !userIsInputing && beginTextInput(event as any as PointerEvent)"
			@blur="onBlur"
			:class="{
				'invalid': !proposedValueIsValid,
				'inputing': userIsInputing,
			}"
			
			:style="{
				'--slider-progress': hasBounds ? progress : 0,
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