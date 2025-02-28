<script lang="ts" setup>
import {inject, computed, Ref, watch, ref, getCurrentInstance, onMounted, onUnmounted} from "vue";

import NodeVue from "./NodeVue.vue";
import NodeSocket from "./NodeSocket.vue";
import NodeSpecialInput from "./NodeSpecialInput.vue";
import NodeOutput from "./NodeOutput.vue";

import {InSocket, Node, NodeUpdateSource, OutputDisplayType} from "$/node/";
import {models, spaces, math, images, organization, output, booleans} from "$/node-types/";

import {clearTextSelection} from "$/util";

import getString from "$/strings";

import {selectedNodes, modifierKeys} from "@/components/store";
import createDragListener from "@vaie/drag-listener";


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
  (event: "field-value-change", requiresShaderReload: boolean, updateSource: NodeUpdateSource): void,
}>();

watch(props.node.ins, () => {
  emit("potential-socket-position-change");
});
watch(props.node.outs, () => {
  emit("potential-socket-position-change");
});

const nodeVue = getCurrentInstance()!.proxy as InstanceType<typeof NodeVue>;


const isSelected = computed(() => selectedNodes.has(props.node));


const viewportScale = inject("treeViewportScale") as Ref<number>;

const begiNodeDrag = createDragListener({
  shouldCancel(event: PointerEvent) {
    // Make this check more sophisticated
    return ["INPUT", "SELECT"].includes((event.target as Element).tagName)
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


const nodeCategories = new Map([models, spaces, math, booleans, images, organization, output]
    .map(category =>
        Object.values(category)
            .map(nodeType => [nodeType.TYPE, category]))
    .flat() as [symbol, unknown][]);


const category = computed(() => nodeCategories.get(props.node.type));

const categoryNames = new Map<unknown, string>([
  [models, "models"],
  [spaces, "spaces"],
  [math, "math"],
  [booleans, "booleans"],
  [images, "images"],
  [output, "output"],
]);
const nodeCategoryClass = computed(() =>
    categoryNames.has(category.value)
        ? `category--${categoryNames.get(category.value)}`
        : ""
);


const instance = getCurrentInstance();
watch(props.node, () => { // update please :(
  instance?.proxy?.$forceUpdate();
});


const nodeVues = inject("nodeVues") as Map<Node, InstanceType<typeof NodeVue>>;
onMounted(() => {
  nodeVues.set(props.node, nodeVue);
});
onUnmounted(() => {
  nodeVues.delete(props.node);
});


const beginResizeDragLeft = createDragListener({
  onDown(moveEvent) {
    return {
      originalWidth: props.node.width,
      originalX: props.node.pos[0],
    };
  },

  onDrag(moveEvent, displacement, {originalWidth, originalX}) {
    const newWidth = originalWidth - displacement.x / viewportScale.value;
    if (newWidth > props.node.minWidth) {
      props.node.width = newWidth;
      props.node.pos[0] = originalX + displacement.x / 2;
    }

    emit("potential-socket-position-change");
  },
});


const beginResizeDragRight = createDragListener({
  onDown(moveEvent) {
    return {
      originalWidth: props.node.width,
      originalX: props.node.pos[0],
    };
  },

  onDrag(moveEvent, displacement, {originalWidth, originalX}) {
    const newWidth = originalWidth + displacement.x / viewportScale.value;
    if (newWidth > props.node.minWidth) {
      props.node.width = newWidth;
      props.node.pos[0] = originalX + displacement.x / 2;
    }

    emit("potential-socket-position-change");
  },
});


const outputVue = ref<InstanceType<typeof NodeOutput>>();
const inputVue = ref<InstanceType<typeof NodeSpecialInput>>();
const reload = (requiresShaderReload: boolean, updateSource:  NodeUpdateSource) => {
  outputVue.value?.reload(requiresShaderReload, updateSource);
  inputVue.value?.reload(requiresShaderReload, updateSource);
};
defineExpose({
  reload,
});

Object.assign(nodeVue, {
  reload,
})

</script>

<template>
  <div
    class="node"
    @pointerdown="event => {
      emitNodeSelected(event);
      begiNodeDrag(event);
    }"
    :style="{
      'left': `${node.pos[0]}px`,
      'top': `${node.pos[1]}px`,
      '--node-width': `${node.width}px`,
    } as any"
    :class="[{
      'selected': isSelected,
      'reroute': node instanceof organization.RerouteNode,
    }, nodeCategoryClass]"
  >
    <div class="node-border"></div>
    <div
      class="node-resize left"
      @pointerdown="event => {
        if (event.button !== 0) return;
        beginResizeDragLeft(event);
        event.stopPropagation();
      }"
    ></div>
    <div
      class="node-resize right"
      @pointerdown="event => {
        if (event.button !== 0) return;
        beginResizeDragRight(event);
        event.stopPropagation();
      }"
    ></div>

    <div
      class="label"
      v-if="shouldDisplayLabel"
      v-html="getString(node.label)"
    ></div>

    <NodeSpecialInput
      :node="node"
      ref="inputVue"
      
      @value-change="(requiresShaderReload, editedSocket) => $emit('field-value-change', requiresShaderReload, NodeUpdateSource.NodeSpecialInput(editedSocket))"
    />

    <!-- <div class="node-content">
      <div class="fields">
        <NodeField v-for="field of node.fields"
            :key="field.id"
            :field="field" />
      </div>
    </div> -->

    <div class="in-sockets">
      <template
        v-for="(socket, index) of node.ins"
        :key="socket.id"
      >
        <NodeSocket
          :socket="socket"
          @drag-socket="(socketVue: InstanceType<typeof NodeSocket>) => $emit('drag-socket', socketVue)"
          @link-to-socket="(socketVue: InstanceType<typeof NodeSocket>) => (
            $emit('link-to-socket', socketVue),
            $emit('tree-update'),
            $emit('potential-socket-position-change'))"

          @unlink="
            $emit('tree-update'),
            $emit('potential-socket-position-change')"
        
          @field-value-change="(requiresShaderReload: boolean, editedSocket: InSocket) => $emit('field-value-change', requiresShaderReload, NodeUpdateSource.InSocket(editedSocket))"
        />
      </template>
    </div>

    <div class="out-sockets">
      <NodeSocket
        v-for="socket of node.outs"
        :key="socket.id"
        :socket="socket"
        @drag-socket="(socketVue: InstanceType<typeof NodeSocket>) => $emit('drag-socket', socketVue)"
        @link-to-socket="(socketVue: InstanceType<typeof NodeSocket>) => (
          $emit('link-to-socket', socketVue),
          $emit('tree-update'),
          $emit('potential-socket-position-change'))
        "

        @unlink="
          $emit('tree-update'),
          $emit('potential-socket-position-change')
        "
      />
    </div>

    <!-- {{node.output().map((x: number) => x.toFixed(4))}} -->
    <NodeOutput
      :node="node"
      ref="outputVue"
      @force-update="(requiresShaderReload: boolean, editedSocket: InSocket) => $emit('field-value-change', requiresShaderReload, NodeUpdateSource.InSocket(editedSocket))"
      v-if="(props.node.constructor as typeof Node).outputDisplayType !== OutputDisplayType.None"
    />
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

  transform: translateX(-50%);
  box-shadow: 0 4px 40px -20px #000000af;
  border-radius: calc(1em - var(--node-border-width));

  font-size: calc(14/16 * 1em);

  cursor: default;

  --node-width: 40px;
  --node-border-width: 4px;
  --node-widget-border-radius: 0.5rem;
  --node-border-background: #ffffff3f; //linear-gradient(#9c20aa, #fb3570);
  --node-background: #2e3331df;


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
  }

  > .node-border {
    @include gradient-border(var(--node-border-width), var(--node-border-background));
  }

  > .node-resize {
    --node-resize-width: 20px;
    // cuts halfway into the border
    --node-resize-offset: calc((var(--node-resize-width) + var(--node-border-width)) / -2);

    position: absolute;
    height: 100%;
    width: var(--node-resize-width);
    top: 0;

    cursor: ew-resize;

    &.left {
      left: var(--node-resize-offset);
    }

    &.right {
      right: var(--node-resize-offset);
    }
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
  &.category--booleans {
    --node-border-background: linear-gradient(hsl(10deg 20% 80%), hsl(-20deg 60% 70%));
    --node-background: hsl(320deg 15% 22% / 0.8745);
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