<script lang="ts" setup>
import {inject, computed, watch, getCurrentInstance, onMounted, ref} from "vue";

import NodeOutputColorValues from "./NodeOutputColorValues.vue";
import NodeOutputColorDisplay from "./NodeOutputColorDisplay.vue";
import NodeOutputCssRgbVec from "./NodeOutputCssRgbVec.vue";
import NodeOutputCssColor from "./NodeOutputCssColor.vue";

import {InSocket, Node, OutputDisplayType} from "@/models/Node";
import { NodeWithOverloads } from "@/models/Overload";
import {output} from "@/models/nodetypes";
import {Col} from "@/models/colormanagement";
import { Vec3 } from "@/util";
import { tree } from "../store";

const props = defineProps<{
  node: Node,
}>();

const hasConstantOutput = ref(true);
const setHasConstantOutput = () => {
  hasConstantOutput.value = props.node.getDependencyAxes().size === 0;
};
onMounted(setHasConstantOutput);
watch(tree.links, setHasConstantOutput)

const type = computed(() => (props.node.constructor as typeof Node).outputDisplayType);

const display = computed(() => props.node.display());

const nDecimals = 4;

watch(() => props.node.getDependencyAxes().size, () => {
  getCurrentInstance()?.proxy?.$forceUpdate();
});


const colorDisplayVue = ref<InstanceType<typeof NodeOutputColorDisplay>>();
defineExpose({
  reload: (requiresShaderReload: boolean, editedSocket: Node | InSocket | null) => {
    colorDisplayVue.value?.reload(requiresShaderReload, editedSocket);
  },
});
</script>

<template>
  <div class="node-output"
      v-if="type !== OutputDisplayType.None">

    <template v-if="type === OutputDisplayType.Color">
      <NodeOutputColorValues :values="display.values"
          :labels="display.labels"
          :flags="display.flags"
          v-if="hasConstantOutput" />
      <NodeOutputColorDisplay :node="node"
          ref="colorDisplayVue" />
    </template>

    <template v-else-if="type === OutputDisplayType.Float">
      <div class="output-values"
          v-if="hasConstantOutput">{{display.values[0].toFixed(nDecimals)}}</div>
    </template>

    <template v-else-if="type === OutputDisplayType.Vec">
      <NodeOutputColorValues :values="display.values"
          :labels="display.labels"
          :flags="display.flags"
          v-if="hasConstantOutput" />
    </template>

    <template v-else-if="type === OutputDisplayType.Css && node instanceof NodeWithOverloads">
      <template v-if="hasConstantOutput">
        <NodeOutputCssRgbVec :rgbVec="display.values as Vec3"
            v-if="node.overloadManager.mode === node.overloadManager.dropdown.data.options?.[0].value" />
        <NodeOutputCssColor :color="display.values as Col"
            v-else />
      </template>
    </template>

    <template v-else-if="node instanceof output.ImagePlotNode">
      <NodeOutputColorDisplay :node="node"
          :width="Math.max(1, node.widthSocket.inValue())"
          :height="Math.max(1, node.heightSocket.inValue())"
          :webglViewportWidth="node.normalizeCoordsSocket.inValue() ? 1 : node.widthSocket.inValue()"
          :webglViewportHeight="node.normalizeCoordsSocket.inValue() ? 1 : node.heightSocket.inValue()"
          
          ref="colorDisplayVue" />
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