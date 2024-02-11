<script lang="ts" setup>
import {PropType, computed} from 'vue';

import {settings} from "./store";

import {Col} from "@/models/colormanagement";
import {SocketFlag} from '@/models/Node';

const props = defineProps<{
	values: string[],
	labels: string[],
}>();

</script>

<template>
	<div class="output-values two-column">
		<template v-for="(value, index) of values">
			<div class="header">
				{{index < labels.length ? labels[index] : ''}}
			</div>
			<div class="data">
                {{values[index]}}
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
	}
}
</style>