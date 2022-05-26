<script lang="ts" setup>
import {defineComponent, onMounted, PropType, ref, watch} from "vue";

import {acceptAlways, identity} from "./base-functions";

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

watch(() => props.modelValue, () => {
	if (userIsInputing.value) return;
	setDisplayToTrueValue();
});
</script>

<template>
	<input type="text"
			v-model="displayValue"
			@input="onInput"
			@change="onChange"
			@blur="onBlur"
			:class="{invalid: !proposedValueIsValid}" />
</template>

<style lang="scss" scoped>
input {
	background: rgb(85, 88, 87);
	border: none;
	color: inherit;

	margin-bottom: 0.25rem;
	border-radius: 4px;

	&.invalid {
		color: red;
	}
}
</style>