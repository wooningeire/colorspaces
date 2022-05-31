<script lang="ts" setup>
import {inject, computed} from "vue";

import NodeOutputColorValues from "./NodeOutputColorValues.vue";
import NodeOutputColorDisplay from "./NodeOutputColorDisplay.vue";

import {Node, OutputDisplayType} from "@/models/Node";

const props = defineProps({
	node: {
		type: Node,
		required: true,
	},
});

const hasConstantOutput = computed(() => props.node.getDependencyAxes().size === 0);

const type = computed(() => (props.node.constructor as typeof Node).outputDisplayType);

const output = computed(() => props.node.output({coords: [0, 0]}));


const nDecimals = 4;
</script>

<template>
	<div class="node-output"
			v-if="type !== OutputDisplayType.None">

		<template v-if="type === OutputDisplayType.Color">
			<NodeOutputColorValues :values="output"
					v-if="hasConstantOutput" />
			<NodeOutputColorDisplay :node="node" />
		</template>

		<template v-else-if="type === OutputDisplayType.Float">
			<div class="output-values"
					v-if="hasConstantOutput">{{output.toFixed(nDecimals)}}</div>
		</template>
	</div>
</template>

<style lang="scss" scoped>
:deep(.output-values) {
	max-width: 100%;
	overflow-x: auto;

	font-family: var(--font-mono);
	font-size: 0.75em;
}
</style>