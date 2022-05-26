<script lang="ts" setup>
import {defineComponent, reactive, PropType, ref, watch} from "vue";

import BaseEntry from "./BaseEntry.vue";

import {acceptAlways, cloneArray} from "./base-functions";

import {Vec3} from "@/util";

const props = defineProps({
	modelValue: {
		type: Array as any as PropType<Vec3>,
		required: true,
	},

	validate: {
		type: Function as PropType<<T>(proposedValue: T) => boolean>,
		default: acceptAlways,
	},

	convertIn: {
		type: Function as PropType<<T>(value: T) => T>,
		default: cloneArray,
	},

	convertOut: {
		type: Function as PropType<<T>(value: T) => T>,
		default: cloneArray,
	},
});


const displayValue = ref(props.convertIn(props.modelValue));


const proposedValueIsValid = ref(true);
const userIsInputing = ref(false);


const emit = defineEmits([
	"update:modelValue",
]);


const setDisplayToTrueValue = () => {
	displayValue.value = props.convertIn(props.modelValue);
};


const onInput = () => {
	userIsInputing.value = true;
	const proposedValue = props.convertOut(displayValue.value);

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

	
watch(() => props.modelValue, () => {
	if (userIsInputing.value) return;
	setDisplayToTrueValue();
});
</script>

<template>
	<div @input="onInput"
			@change.stop="onChange"
			@blur.capture="onBlur"
			:class="{invalid: !proposedValueIsValid}">
		<BaseEntry v-model="displayValue[0]" />
		<BaseEntry v-model="displayValue[1]" />
		<BaseEntry v-model="displayValue[2]" />
	</div>
</template>

<style scoped>
.invalid :deep(input) {
	color: red;
}
</style>