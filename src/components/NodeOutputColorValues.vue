<script lang="ts" setup>
import {PropType, computed} from 'vue';

import {settings} from "./store";

import {Col} from "@/models/colormanagement";

const props = defineProps({
	values: {
		type: Col,
		required: true,
	},
});

const nDecimals = 4;

const labels = (props.values.constructor as typeof Col).labels;
const isRgb = (props.values.constructor as typeof Col).isRgb;

</script>

<template>
	<div class="output-values">
		<template v-for="(value, index) of values">
			<div class="header">
				{{index < labels.length ? labels[index] : ""}}
			</div>
			<div class="data">{{
				(isRgb
					? values[index] * settings.rgbScale
					: values[index]
				).toFixed(nDecimals)
			}}</div>
		</template>
	</div>
</template>

<style lang="scss" scoped>
.output-values {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 0 1em;

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