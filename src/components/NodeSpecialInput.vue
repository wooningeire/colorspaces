<script lang="ts" setup>
import SpectralPowerDistributionEntry from "./input/SpectralPowerDistributionEntry.vue";
import ChromaticityEntry from "./input/ChromaticityEntry.vue";

import {Node} from "@/models/Node";
import {models, output} from "@/models/nodetypes";
import NodeOutputColorDisplay from "./NodeOutputColorDisplay.vue";


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

  <NodeOutputColorDisplay v-else-if="node instanceof output.ImagePlotNode"
      :node="node"
      :width="Math.max(1, node.widthSocket.inValue())"
      :height="Math.max(1, node.heightSocket.inValue())"
      :imageWidth="node.normalizeCoordsSocket.inValue() ? 1 : node.widthSocket.inValue()"
      :imageHeight="node.normalizeCoordsSocket.inValue() ? 1 : node.heightSocket.inValue()" />
</template>

<style lang="scss" scoped>
.color-display-box {
  margin: auto;
  max-width: 100%;
}
</style>