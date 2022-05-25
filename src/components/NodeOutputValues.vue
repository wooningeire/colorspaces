<script lang="ts" setup>
import {PropType} from 'vue';

import {Col} from "@/models/colormanagement";

const props = defineProps({
	values: {
		type: Col,
		required: true,
	},
});

const nDecimals = 4;

const labels = (props.values.constructor as typeof Col).labels;

</script>

<template>
	<div class="output-values">
		<template v-for="(value, index) of values">
			<div class="header">
				{{index < labels.length ? labels[index] : ""}}
			</div>
			<div class="data">{{values[index].toFixed(nDecimals)}}</div>
		</template>
	</div>
</template>

<style lang="scss">
.output-values {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 0 1em;

	font-family: Ubunto Mono, monospace;
	font-size: 0.75em;

	text-align: right;

	> .header {
		font-weight: 700;

		// &:not(:empty)::after {
		// 	content: ":";
		// }
	}

	// > .data {
	// }
}
</style>