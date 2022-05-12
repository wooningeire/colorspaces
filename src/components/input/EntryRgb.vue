<template>
	<div @input="onInput"
			@change.stop="onChange"
			@focus="onFocus"
			@blur="onBlur"
			:class="{invalid: !proposedValueIsValid}">
		<BaseEntry v-model="displayColor[0]" />
		<BaseEntry v-model="displayColor[1]" />
		<BaseEntry v-model="displayColor[2]" />
	</div>
</template>

<script lang="ts">
import {defineComponent} from "vue";
import converterMixin from "./converterMixin";
import BaseEntry from "./BaseEntry.vue";

import {Color} from "@src/util";

const acceptAlways = () => true;

export default defineComponent({
	name: "EntryRgb",

	mixins: [converterMixin],

	props: {
		validate: {
			type: Function,
			default: acceptAlways,
		},

		modelValue: {
			type: Array,
		},
	},

	data() {
		return {
			proposedValueIsValid: true,
			isFocused: false,

			displayColor: [...this.modelValue],
		};
	},

	methods: {
		onInput(event: InputEvent) {
			const proposedValue = this.convertOut(this.displayColor);

			this.proposedValueIsValid = this.validate(proposedValue);
			if (this.proposedValueIsValid) {
				this.$emit("update:modelValue", proposedValue);
			} else {
				event.stopPropagation();
			}
		},

		updateDisplayValue() {
			Object.assign(this.displayColor, this.convertIn(this.modelValue));
			// this.displayColor = this.convertIn(this.modelValue);
		},

		onChange() {
			this.updateDisplayValue();
			this.proposedValueIsValid = true;
		},

		onFocus() {
			this.isFocused = true;
		},

		onBlur() {
			this.isFocused = false;
		},
	},
	
	watch: {
		modelValue() {
			if (this.isFocused) return;
			this.updateDisplayValue();
		},
	},
	components: {
		BaseEntry,
	},

	/* created() {
		this.displayColor = this.modelValue;
	}, */
});
</script>

<style scoped>
.invalid {
	color: red;
}
</style>