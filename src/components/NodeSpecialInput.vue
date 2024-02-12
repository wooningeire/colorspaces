<script lang="ts" setup>
import SpectralPowerDistributionEntry from "./input/SpectralPowerDistributionEntry.vue";
import ChromaticityEntry from "./input/ChromaticityEntry.vue";

import {Node} from "@/models/Node";
import {models, output} from "@/models/nodetypes";


const props = defineProps<{
	node: Node,
}>();
</script>

<template class="special-input">
	<SpectralPowerDistributionEntry v-if="node instanceof models.SpectralPowerDistributionNode"
			:node="node"
			v-model="node.distribution"
			v-model:datasetId="node.colorMatchingDataset" />

	<ChromaticityEntry v-else-if="node instanceof output.ChromaticityPlotNode"
			:node="node" />
</template>

<style lang="scss" scoped>
</style>