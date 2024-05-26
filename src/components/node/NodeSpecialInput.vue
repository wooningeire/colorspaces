<script lang="ts" setup>
import SpectralPowerDistributionEntry from "../input/SpectralPowerDistributionEntry.vue";
import ChromaticityEntry from "../input/ChromaticityEntry.vue";

import {InSocket, Node, NodeUpdateSource} from "$/node/";
import {models, output} from "$/node-types";
import NodeOutputColorDisplay from "./NodeOutputColorDisplay.vue";
import { ref } from "vue";


const props = defineProps<{
  node: Node,
}>();

const emit = defineEmits<{
  (event: "value-change", requiresShaderReload: boolean, editedNodeSpecial: Node): void,
}>();


const colorDisplayVue = ref<InstanceType<typeof NodeOutputColorDisplay>>();
defineExpose({
  reload: (requiresShaderReload: boolean, updateSource: NodeUpdateSource) => {
    colorDisplayVue.value?.reload(requiresShaderReload, updateSource);
  },
});
</script>

<template class="special-input">
  <SpectralPowerDistributionEntry
    v-if="node instanceof models.SpectralPowerDistributionNode"
    :node="node"
    v-model="node.distribution"
    v-model:datasetId="node.colorMatchingDataset"
    @update:distribution="$emit('value-change', false, node)"
    @update:dataset-id="$emit('value-change', true, node)"
  />

  <ChromaticityEntry
    v-else-if="node instanceof output.ChromaticityPlotNode"
    :node="node"
  />
</template>

<style lang="scss" scoped>
.color-display-box {
  margin: auto;
  max-width: 100%;
}
</style>