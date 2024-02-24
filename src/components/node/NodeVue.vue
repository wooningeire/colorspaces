<script lang="ts" setup>
import {inject, computed, Ref, watch, ref, getCurrentInstance, onMounted} from "vue";
import * as marked from "marked";

import NodeSocket from "./NodeSocket.vue";
import NodeField from "./NodeField.vue";
import NodeSpecialInput from "./NodeSpecialInput.vue";
import NodeOutput from "./NodeOutput.vue";
import NodeOutputColorDisplay from "./NodeOutputColorDisplay.vue";

import {Node} from "@/models/Node";
import {models, spaces, math, images, externals, organization, output} from "@/models/nodetypes";

import {Listen, clearTextSelection, Vec2} from "@/util";

import getString from "@/strings";

import {selectedNodes, modifierKeys} from "../store";
import makeDragListener from "../draggable";


const props = defineProps<{
  node: Node,
}>();


const emit = defineEmits<{
  (event: "drag-socket", socketVue: InstanceType<typeof NodeSocket>): void,
  (event: "link-to-socket", socketVue: InstanceType<typeof NodeSocket>): void,
  (event: "node-dragged"): void,
  (event: "potential-socket-position-change"): void,
  (event: "tree-update"): void,
  (event: "node-selected", targetNode: Node, clearSelectionFirst: boolean): void,
  (event: "field-value-change", requiresShaderReload: boolean): void,
}>();


onMounted(() => {
  Object.assign(props.node.pos, [
    props.node.pos[0] - (getCurrentInstance()?.proxy?.$el.offsetWidth / 2 ?? 0),
    props.node.pos[1] - (getCurrentInstance()?.proxy?.$el.offsetHeight / 2 ?? 0),
  ]);
});


const isSelected = computed(() => selectedNodes.has(props.node));


const viewportScale = inject("treeViewportScale") as Ref<number>;

const beginDrag = makeDragListener({
  shouldCancel(event: PointerEvent) {
    // Make this check more sophisticated
    // return event.target !== this.$el;
    return ["input", "select"].includes((event.target as Element).tagName.toLowerCase())
        || !props.node.canMove
        || event.button !== 0;
  },

  onDrag(moveEvent) {
    for (const node of selectedNodes) {
      node.pos[0] += moveEvent.movementX / viewportScale.value;
      node.pos[1] += moveEvent.movementY / viewportScale.value;
    }

    emit("node-dragged");
    emit("potential-socket-position-change");
  },
});


const emitNodeSelected = (event: PointerEvent) => {
  if (modifierKeys.shift) {
    clearTextSelection();
    // event.preventDefault();
  }

  emit("node-selected", props.node, !modifierKeys.shift);
};


const shouldDisplayLabel = computed(() => !(props.node instanceof organization.RerouteNode))


const nodeCategories = new Map([models, spaces, math, images, externals, organization, output]
    .map(category =>
        Object.values(category)
            .map(nodeType => [nodeType.TYPE, category]))
    .flat() as [symbol, unknown][]);


const category = computed(() => nodeCategories.get(props.node.type));

const categoryNames = new Map<unknown, string>([
  [models, "models"],
  [spaces, "spaces"],
  [math, "math"],
  [images, "images"],
  [externals, "externals"],
  [output, "output"],
]);
const nodeCategoryClass = computed(() =>
    categoryNames.has(category.value)
        ? `category--${categoryNames.get(category.value)}`
        : ""
);


const isSubtle = computed(() => 
    props.node instanceof externals.DevicePostprocessingNode
    || props.node instanceof externals.EnvironmentNode
    || props.node instanceof externals.VisionNode
);

const instance = getCurrentInstance();
watch(props.node, () => { // update please :(
  instance?.proxy?.$forceUpdate();
});


const outputVue = ref<InstanceType<typeof NodeOutput>>();
const inputVue = ref<InstanceType<typeof NodeSpecialInput>>();
defineExpose({
  reloadOutput: (requiresShaderReload: boolean) => {
    outputVue.value?.reload(requiresShaderReload);
    inputVue.value?.reload(requiresShaderReload);
  },
});

</script>

<template>
  <div class="node"
      @pointerdown="event => {
        emitNodeSelected(event);
        beginDrag(event);
      }"
      :style="{
        'left': `${node.pos[0]}px`,
        'top': `${node.pos[1]}px`,
        '--node-width': `${node.width}px`,
      } as any"
      :class="[{
        'subtle': isSubtle,
        'selected': isSelected,
        'reroute': node instanceof organization.RerouteNode,
      }, nodeCategoryClass]">
    <div class="node-border"></div>

    <div class="label"
        v-if="shouldDisplayLabel"
        v-html="marked.parseInline(node.label)">
    </div>

    <NodeSpecialInput :node="node"
        ref="inputVue"
        
        @value-change="requiresShaderReload => $emit('field-value-change', requiresShaderReload)" />

    <!-- <div class="node-content">
      <div class="fields">
        <NodeField v-for="field of node.fields"
            :key="field.id"
            :field="field" />
      </div>
    </div> -->

    <div class="in-sockets">
      <template v-for="(socket, index) of node.ins"
          :key="socket.id">
        <NodeOutputColorDisplay v-if="node instanceof externals.DeviceTransformNode
                && socket.hasLinks"
            :node="node"
            :socket="socket" />

        <NodeSocket :socket="socket"
            @drag-socket="(socketVue: InstanceType<typeof NodeSocket>) => $emit('drag-socket', socketVue)"
            @link-to-socket="(socketVue: InstanceType<typeof NodeSocket>) => (
              $emit('link-to-socket', socketVue),
              $emit('tree-update'),
              $emit('potential-socket-position-change'))"

            @value-change="$emit('tree-update')"
            @unlink="
              $emit('tree-update'),
              $emit('potential-socket-position-change')"
          
            @field-value-change="(requiresShaderReload: boolean) => $emit('field-value-change', requiresShaderReload)" />
      </template>
    </div>

    <div class="out-sockets">
      <NodeSocket v-for="socket of node.outs"
          :key="socket.id"
          :socket="socket"
          @drag-socket="(socketVue: InstanceType<typeof NodeSocket>) => $emit('drag-socket', socketVue)"
          @link-to-socket="(socketVue: InstanceType<typeof NodeSocket>) => (
            $emit('link-to-socket', socketVue),
            $emit('tree-update'),
            $emit('potential-socket-position-change'))"

          @unlink="
            $emit('tree-update'),
            $emit('potential-socket-position-change')"/>
    </div>

    <!-- {{node.output().map((x: number) => x.toFixed(4))}} -->
    <NodeOutput :node="node"
        ref="outputVue" />
  </div>
</template>

<style lang="scss" scoped>
@import "../mixins.scss";

.node {
  position: absolute;
  // display: inline grid;
  display: flex;
  flex-flow: column;
  width: var(--node-width);
  padding: 0.5em 0;

  background: var(--node-background);

  box-shadow: 0 4px 40px -20px #000000af;
  border-radius: calc(1em - var(--node-border-width));

  font-size: calc(14/16 * 1em);

  cursor: default;

  --node-border-width: 4px;
  --node-border-background: #ffffff3f; //linear-gradient(#9c20aa, #fb3570);
  --node-background: #2e3331df;

  --node-width: 40px;

  // grid-template-areas:
  //     "A A"
  //     "B C";
  // gap: 0.5em;

  // > .node-content {
  //   grid-area: A;
  // }

  &.subtle {
    transition: 0.2s opacity ease;

    &:not(:hover) {
      opacity: 0.25;
    }
  }

  &.selected > .node-border {
    --node-border-background: #80efff;
  }

  > .label {
    position: absolute;
    bottom: calc(100% + 0.25em);

    // text-align: center;
    padding: 0 0.25em;
    // font-weight: 800;

    // pointer-events: none;
  }

  > .node-content {
    margin-bottom: 0.5em;

    > .fields {
      display: flex;
      flex-flow: column;
    }
  }

  > .in-sockets :deep(.color-display-box) {
    position: absolute;
    right: .5em;
    height: 1em;
  }

  &.reroute {
    flex-flow: row;
    justify-content: space-between;

    :deep(.socket-container) {
      --socket-text-padding: 0;
    }
  }
  

  > .node-output {
    display: flex;
    justify-content: space-evenly;
    align-items: center;

    width: 100%;

    :deep(.color-display-box) {
      height: 3em;
    } 
  }

  > .node-border {
    @include gradient-border(var(--node-border-width), var(--node-border-background));
  }

  :deep(input:is([type="text"], [type="file"])) {
    width: 100%;
  }

  &.category--models {
    --node-border-background: linear-gradient(hsl(-20deg 40% 60%), hsl(30deg 40% 50%));
    --node-background: hsl(-20deg 20% 20% / 0.8745);
  }
  &.category--spaces {
    --node-border-background: linear-gradient(hsl(260deg 40% 60%), hsl(300deg 40% 60%));
    --node-background: hsl(260deg 20% 20% / 0.8745);
  }
  &.category--math {
    --node-border-background: linear-gradient(hsl(50deg 40% 60%), hsl(90deg 40% 60%));
    --node-background: hsl(80deg 15% 18% / 0.8745);
  }
  &.category--images {
    --node-border-background: linear-gradient(hsl(165deg 10% 50%), hsl(185deg 10% 60%));
    --node-background: hsl(165deg 10% 20% / 0.8745);
  }
  &.category--externals,
  &.category--output {
    --node-border-background: linear-gradient(hsl(220deg 40% 50%), hsl(200deg 40% 50%));
    --node-background: hsl(220deg 25% 20% / 0.8745);
  }
}
</style>