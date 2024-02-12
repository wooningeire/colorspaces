<script lang="ts" setup>
import {inject, computed, watch, getCurrentInstance} from "vue";

import NodeOutputColorValues from "./NodeOutputColorValues.vue";
import NodeOutputColorDisplay from "./NodeOutputColorDisplay.vue";
import NodeOutputCssRgbVec from "./NodeOutputCssRgbVec.vue";
import NodeOutputCssColor from "./NodeOutputCssColor.vue";

import {Node, NodeWithOverloads, OutputDisplayType} from "@/models/Node";
import {Col} from "@/models/colormanagement";
import { Vec3 } from "@/util";

const props = defineProps<{
	node: Node,
}>();

const hasConstantOutput = computed(() => props.node.getDependencyAxes().size === 0);

const type = computed(() => (props.node.constructor as typeof Node).outputDisplayType);

const output = computed(() => props.node.display());

const nDecimals = 4;

watch(() => props.node.getDependencyAxes().size, () => {
	getCurrentInstance()?.proxy?.$forceUpdate();
});
</script>

<template>
	<div class="node-output"
			v-if="type !== OutputDisplayType.None">

		<template v-if="type === OutputDisplayType.Color">
			<NodeOutputColorValues :values="output.values"
					:labels="output.labels"
					:flags="output.flags"
					v-if="hasConstantOutput" />
			<NodeOutputColorDisplay :node="node" />
		</template>

		<template v-else-if="type === OutputDisplayType.Float">
			<div class="output-values"
					v-if="hasConstantOutput">{{output.values[0].toFixed(nDecimals)}}</div>
		</template>

		<template v-else-if="type === OutputDisplayType.Vec">
			<NodeOutputColorValues :values="output.values"
					:labels="output.labels"
					:flags="output.flags"
					v-if="hasConstantOutput" />
		</template>

		<template v-else-if="type === OutputDisplayType.Css && node instanceof NodeWithOverloads">
			<template v-if="hasConstantOutput">
				<NodeOutputCssRgbVec :rgbVec="output.values as Vec3"
						v-if="node.overloadManager.mode === node.overloadManager.dropdown.data.options?.[0].value" />
				<NodeOutputCssColor :color="output.values as Col"
						v-else />
			</template>
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