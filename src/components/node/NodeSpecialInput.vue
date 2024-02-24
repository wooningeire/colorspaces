<script lang="ts" setup>
import SpectralPowerDistributionEntry from "../input/SpectralPowerDistributionEntry.vue";
import ChromaticityEntry from "../input/ChromaticityEntry.vue";

import {Node} from "@/models/Node";
import {models, output} from "@/models/nodetypes";
import NodeOutputColorDisplay from "./NodeOutputColorDisplay.vue";
import { ref } from "vue";


const props = defineProps<{
  node: Node,
}>();

const emit = defineEmits<{
  (event: "value-change", requiresShaderReload: boolean): void,
}>();


const colorDisplayVue = ref<InstanceType<typeof NodeOutputColorDisplay>>();
defineExpose({
  reload: (requiresShaderReload: boolean) => {
    colorDisplayVue.value?.reload(requiresShaderReload);
  },
});
</script>

<template class="special-input">
  <SpectralPowerDistributionEntry v-if="node instanceof models.SpectralPowerDistributionNode"
      :node="node"
      v-model="node.distribution"
      v-model:datasetId="node.colorMatchingDataset"
      @update:distribution="$emit('value-change', false)"
      @update:dataset-id="$emit('value-change', true)" />

  <ChromaticityEntry v-else-if="node instanceof output.ChromaticityPlotNode"
      :node="node" />

  <NodeOutputColorDisplay v-else-if="node instanceof output.ImagePlotNode"
      :node="node"
      :width="Math.max(1, node.widthSocket.inValue())"
      :height="Math.max(1, node.heightSocket.inValue())"
      :imageWidth="node.normalizeCoordsSocket.inValue() ? 1 : node.widthSocket.inValue()"
      :imageHeight="node.normalizeCoordsSocket.inValue() ? 1 : node.heightSocket.inValue()"
      
      ref="colorDisplayVue" />
</template>

<style lang="scss" scoped>
.color-display-box {
  margin: auto;
  max-width: 100%;
}
</style>