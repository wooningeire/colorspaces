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
      :width="Math.max(1, node.output({
        coords: [0, 0],
        socket: node.ins[1],
      }) as number)"
      :height="Math.max(1, node.output({
        coords: [0, 0],
        socket: node.ins[2],
      }) as number)" />
</template>

<style lang="scss" scoped>
.color-display-box {
  margin: auto;
  max-width: 100%;
}
</style>