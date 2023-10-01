<script lang="ts" setup>
import {PropType, computed} from 'vue';

import {settings} from "./store";

import {Col} from "@/models/colormanagement";
import {SocketFlag} from '@/models/Node';

const props = defineProps<{
	values: number[],
	labels: string[],
	flags: SocketFlag[],
}>();

const nDecimals = 4;

// const labels = (props.values.constructor as typeof Col).labels;
// const isRgb = (props.values.constructor as typeof Col).isRgb;

</script>

<template>
	<div class="output-values two-column">
		<template v-for="(value, index) of values">
			<div class="header">
				{{index < labels.length ? labels[index] : ''}}
			</div>
			<div class="data">
				<template v-for="flag of [index < flags.length ? flags[index] : SocketFlag.None]">
					{{(flag === SocketFlag.Rgb ? values[index] * settings.rgbScale
							: flag === SocketFlag.Hue ? values[index]  * settings.hueScale
							: values[index]
						).toFixed(nDecimals)
					}}
				</template>
			</div>
		</template>
	</div>
</template>

<style lang="scss" scoped>
.output-values {
	&.two-column {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0 1em;
		text-align: right;
	}

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