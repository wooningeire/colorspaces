<script lang="ts" setup>
import SpectralPowerDistributionEntry from './input/SpectralPowerDistributionEntry.vue';

import {Node} from "@/models/Node";
import {models} from "@/models/nodetypes";


const props = defineProps({
	node: {
		type: Node,
		required: true,
	},
});
</script>

<template class="special-input">
	<SpectralPowerDistributionEntry v-if="node instanceof models.SpectralPowerDistributionNode"
			v-model="node.distribution"
			v-model:datasetId="node.colorMatchingDataset" />
</template>

<style lang="scss" scoped>
</style>