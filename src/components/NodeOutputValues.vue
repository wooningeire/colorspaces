<script lang="ts" setup>
import { PropType } from 'vue';

const props = defineProps({
	values: {
		type: Array as PropType<number[]>,
		required: true,
	},

	labels: {
		type: Array as PropType<string[]>,
		required: true,
	},
});

const nDecimals = 4;

</script>

<template>
	<div class="output-values">
		<template v-for="(value, index) of values">
			<div class="header">{{labels[index]}}</div>
			<div>{{values[index].toFixed(nDecimals)}}</div>
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

		&::after {
			content: ":";
		}
	}
}
</style>