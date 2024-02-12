<script lang="ts" setup>
import {defineComponent, reactive, PropType, ref, watch} from "vue";

import EntrySlider from "./EntrySlider.vue";

import {acceptAlways, cloneArray} from "./base-functions";
import {tooltipController, settings} from "../store";

import {Vec3} from "@/util";
import getString, {NO_DESC, StringKey} from "@/strings";


const props = defineProps({
	modelValue: {
		type: Array as any as PropType<Vec3>,
		required: true,
	},

	validate: {
		// type requires a generic component
		type: Function as PropType<(proposedValue: any) => boolean>,
		default: acceptAlways,
	},

	convertIn: {
		type: Function as PropType<(value: any) => any>,
		default: cloneArray,
	},

	convertOut: {
		type: Function as PropType<(value: any) => any>,
		default: cloneArray,
	},


	maxes: {
		type: Array as PropType<number[]>,
		default: [],
	},

	sliderProps: {
		type: Array,
		default: [],
	},

	descs: {
		type: Array as PropType<StringKey[]>,
		default: [],
	},
});


const displayValue = ref(props.convertOut(props.modelValue));


const proposedValueIsValid = ref(true);
const entryActive = ref(false);


const emit = defineEmits([
	"update:modelValue",
]);


const setDisplayToTrueValue = () => {
	displayValue.value = props.convertOut(props.modelValue);
};


const onInput = () => {
	entryActive.value = true;
	emitValueIfValid();
};

const emitValueIfValid = () => {
	const proposedValue = props.convertIn(displayValue.value);

	proposedValueIsValid.value = props.validate(proposedValue);
	if (proposedValueIsValid.value) {
		emit("update:modelValue", proposedValue);
	}
};

const onChange = () => {
	entryActive.value = false;
	setDisplayToTrueValue();
	proposedValueIsValid.value = true;
};

const onBlur = () => {
	entryActive.value = false;
};


watch(() => [props.modelValue, props.convertOut], () => {
	if (entryActive.value) return;
	setDisplayToTrueValue();
});
</script>

<template>
	<div @change.stop="onChange"
			@blur.capture="onBlur"
			:class="{invalid: !proposedValueIsValid}">
		<EntrySlider v-for="(_, i) of modelValue"
				v-model="displayValue[i]"
				@update:modelValue="emitValueIfValid"
				:max="maxes[i]"
				v-bind="sliderProps[i]"

				:desc="descs[i]" />
	</div>
</template>

<style scoped>
.invalid :deep(input) {
	color: var(--col-invalid-input);
}
</style>