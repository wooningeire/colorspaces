<template>
	<input type="text"
			@input="onInput"
			@change="onChange"
			@blur="onBlur"
			:class="{invalid: !proposedValueIsValid}" />
</template>

<script lang="ts">
import {defineComponent} from "vue";
import converterMixin from "./converterMixin";

const acceptAlways = () => true;

export default defineComponent({
	name: "BaseEntry",

	mixins: [converterMixin],

	props: {
		validate: {
			type: Function,
			default: acceptAlways,
		},
	},

	data: () => ({
		proposedValueIsValid: true,
		userIsInputing: false,
	}),

	methods: {
		onInput(event: InputEvent) {
			this.userIsInputing = true;
			const proposedValue = this.convertOut(Number(this.$el.value));

			this.proposedValueIsValid = this.validate(proposedValue);
			if (this.proposedValueIsValid) {
				this.$emit("update:modelValue", proposedValue);
			} else {
				event.stopPropagation();
			}
		},

		onChange() {
			this.userIsInputing = false;
			this.updateDisplayValue();
			this.proposedValueIsValid = true;
		},

		onBlur() {
			this.userIsInputing = false;
		},
	},
	
	watch: {
		modelValue() {
			if (this.userIsInputing) return;
			this.updateDisplayValue();
		},
	},
});
</script>

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