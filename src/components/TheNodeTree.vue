<script lang="ts" setup>
import {computed, ref, reactive, provide, nextTick, onMounted, Ref, inject, watch} from "vue";

import { Listen } from "@vaie/listen";

import NodeVue from "./node/NodeVue.vue";
import NodeSocket from "./node/NodeSocket.vue";
import TheNodeTreeLinks from "./TheNodeTreeLinks.vue";
import NodeLink from "./node/NodeLink.vue";

import {Vec2, clearTextSelection} from "$/util";
import {Socket, Node, Link, InSocket, NodeUpdateSource} from "$/node/";

import {tree, selectedNodes, modifierKeys, isDraggingNodeFromNodeTray, currentlyDraggedNodeConstructor, DeviceNodes} from "./store";


const pointerX = ref(-1);
const pointerY = ref(-1);


provide("tree", tree);



const socketVues = new WeakMap<Socket, InstanceType<typeof NodeSocket>>();
provide("socketVues", socketVues);
const nodeVues = new Map<Node, InstanceType<typeof NodeVue>>();
provide("nodeVues", nodeVues);
const linkVues = new WeakMap<Link, InstanceType<typeof NodeLink>>();
provide("linkVues", linkVues);

const draggedSocketVue = ref(null as InstanceType<typeof NodeSocket> | null);

const draggedSocket = computed(() => draggedSocketVue.value?.socket);
const draggingSocket = computed(() => Boolean(draggedSocketVue.value));

provide("draggedSocket", draggedSocket);
provide("draggingSocket", draggingSocket);


const onDragSocket = (socketVue: InstanceType<typeof NodeSocket>) => {
  //@ts-ignore
  if (globalThis.chrome) {
    // setTimeout required due to bug in Chromium
    // https://stackoverflow.com/questions/19639969/html5-dragend-event-firing-immediately
    setTimeout(() => {
      draggedSocketVue.value = socketVue;
    }, 0);
  } else {
    // setTimeout must not be used in Firefox
    draggedSocketVue.value = socketVue;
  }

  [pointerX.value, pointerY.value] = socketVue.socketPos();

  const dragListener = Listen.for(window, "dragover", (event: DragEvent) => {
    const pos = screenToViewport([event.pageX, event.pageY]);
    pointerX.value = pos[0];
    pointerY.value = pos[1];
  });

  ((socketVue.socketEl as any as Ref<HTMLDivElement>).value 
      ?? socketVue.socketEl).addEventListener("dragend", () => {
    draggedSocketVue.value = null;

    dragListener.detach();
  }, {once: true});
};

const onLinkToSocket = (socketVue: InstanceType<typeof NodeSocket>) => {
  if (!draggedSocket.value) throw new TypeError("Not currently dragging from a socket");

  if (draggedSocket.value.isInput) {
    Socket.linkSockets(socketVue.socket, draggedSocket.value);
  } else {
    Socket.linkSockets(draggedSocket.value, socketVue.socket);
  }
};



const rerenderLinks = () => {
  // Delay to next tick because socket positions in DOM have not updated yet
  nextTick(() => {
    for (const link of tree.links()) {
      linkVues.get(link)!.$forceUpdate();
    }
  });
};

onMounted(rerenderLinks);


const reloadOutputs = (requiresShaderReload: boolean, updateSource: NodeUpdateSource) => {
  updateSource.srcNode().useElse(
    srcNode => {
      for (const node of srcNode.dependentNodes()) {
        nodeVues.get(node)?.reload(requiresShaderReload, updateSource);
      }
    },
    () => {
      for (const nodeVue of nodeVues.values()) {
        nodeVue.reload(requiresShaderReload, updateSource);
      }
    },
  )
};


const selectNode = (node: Node, clearSelection: boolean=true) => {
  if (clearSelection) {
    selectedNodes.clear();
  }
  selectedNodes.add(node);

  // For layering purposes — places node at top
  tree.nodes.delete(node);
  tree.nodes.add(node);
};

const cancelSelect = () => {
  selectedNodes.clear();
};

const onPointerDownSelf = () => {
  if (modifierKeys.shift) {
    clearTextSelection();
  }

  if (!modifierKeys.shift) {
    cancelSelect();
  }
};



const viewportPos = inject("treeViewportPos") as number[];
const viewportScale = inject("treeViewportScale") as Ref<number>;
const screenToViewport = inject("screenToViewport") as (screenPos: number[]) => number[];

addEventListener("keydown", event => {
  if (event.key !== "Home") return;
  Object.assign(viewportPos, [0, 0]);
  viewportScale.value = 1;
});

const beginDragCamera = (event: PointerEvent) => {
  const moveListener = Listen.for(window, "pointermove", (moveEvent: PointerEvent) => {
    clearTextSelection();

    [viewportPos[0], viewportPos[1]] = [
      viewportPos[0] + moveEvent.movementX / viewportScale.value,
      viewportPos[1] + moveEvent.movementY / viewportScale.value,
    ];
  });

  addEventListener("pointerup", () => {
    moveListener.detach();
  }, {once: true});
};

const onWheel = (event: WheelEvent) => {
  // Order of transformation: translate to cursor pos, then scale, then translate back to original pos (with new scale)

  const cursorOffsetPos = screenToViewport([event.pageX, event.pageY])
      .map((comp, i) => comp + viewportPos[i]);


  const scaleFac = 1.125**-Math.sign(event.deltaY);
  viewportScale.value *= scaleFac;

  Object.assign(viewportPos, [
    viewportPos[0] - cursorOffsetPos[0] + cursorOffsetPos[0] / scaleFac,
    viewportPos[1] - cursorOffsetPos[1] + cursorOffsetPos[1] / scaleFac,
  ]);
};


let animationHandle = 0;
const onAnimationStart = (event: AnimationEvent) => {
  if (!(event.target! as HTMLElement).classList.contains("socket-value-editor")) return;
  updateLinksEveryFrame();
};
const onAnimationEnd = (event: AnimationEvent) => {
  if (!(event.target! as HTMLElement).classList.contains("socket-value-editor")) return;
  cancelAnimationFrame(animationHandle);
};

const updateLinksEveryFrame = () => {
  rerenderLinks();

  animationHandle = requestAnimationFrame(updateLinksEveryFrame);
};


defineExpose({
  selectNode,
  reloadOutputs,
});
</script>

<template>
  <!-- drag events here are from node tray -->
  <div
    class="node-tree"
    @dragover="event => isDraggingNodeFromNodeTray && event.preventDefault()"
    @drop="event => isDraggingNodeFromNodeTray && $emit('add-node', currentlyDraggedNodeConstructor, [event.pageX, event.pageY])"

    @pointerdown.self="onPointerDownSelf"
    @pointerdown="event => event.button === 1 && beginDragCamera(event)"
    @wheel.passive="onWheel"
    
    :style="{
      '--pos-x': `${viewportPos[0]}px`,
      '--pos-y': `${viewportPos[1]}px`,
      '--scale': `${viewportScale}`,
    } as any"
  >
    <div
      class="nodes"
      @animationstart.capture="onAnimationStart"
      @animationend.capture="onAnimationEnd"
    >
      <TransitionGroup name="pop-in">
        <NodeVue
          v-for="node of tree.nodes"
          :key="node.id"
          :node="(node as Node)"
          @drag-socket="onDragSocket"
          @link-to-socket="onLinkToSocket"
          @node-selected="selectNode"

          @potential-socket-position-change="rerenderLinks"
          
          @field-value-change="(requiresShaderReload, updateSource) => reloadOutputs(requiresShaderReload, updateSource)"
          @tree-update="reloadOutputs(true, NodeUpdateSource.TreeReload)"
        />
      </TransitionGroup>
    </div>

    <svg
      class="links"
      :viewbox="`0 0 ${$el?.clientWidth ?? 300} ${$el?.clientHeight ?? 150}`"
    >
      <g>
        <template v-if="draggingSocket">
          <NodeLink
            v-if="draggedSocket?.isOutput"
            class="new-link"
            :link="null"
            :socketVues="socketVues"

            :x0="draggedSocketVue?.socketPos()[0] ?? 0"
            :y0="draggedSocketVue?.socketPos()[1] ?? 0"
            :x1="pointerX"
            :y1="pointerY"
          />
          <NodeLink
            v-else
            class="new-link"
            :link="null"
            :socketVues="socketVues"

            :x0="pointerX"
            :y0="pointerY"
            :x1="draggedSocketVue?.socketPos()[0] ?? 0"
            :y1="draggedSocketVue?.socketPos()[1] ?? 0"
          />
        </template>

        <TheNodeTreeLinks :socketVues="socketVues" />
      </g>
    </svg>
  </div>
</template>

<style lang="scss" scoped>
.node-tree {
  position: relative;
  width: 100%;
  height: 100%;

  display: grid;
  place-items: center;

  overflow: hidden;

  --pos-x: 0;
  --pos-y: 0;
  --scale: 1;
  
  > * {
    grid-area: 1 / 1;
  }

  > .nodes {
    z-index: 1;
    pointer-events: none;

    > :deep(*) {
      pointer-events: initial;
    }

    // vue transition
    > .pop-in-enter-active {
      animation: pop-in .25s cubic-bezier(.26,1.5,.39,.99);
    }
    > .pop-in-leave-active {
      pointer-events: none;
      animation: fade-out .125s cubic-bezier(.44,0,1,.71);
    }
    @keyframes pop-in {
      0% {
        opacity: 0;
        transform:
            translateX(-50%)
            scale(0);
      }
    }

    @keyframes fade-out {
      100% {
        transform:
            translateX(-50%)
            scale(0.5);
        opacity: 0;
      }
    }
  }

  > .nodes,
  > svg {
    width: 100%;
    height: 100%;

    transform-origin: 0 0;
  }

  > .nodes {
    transform:
        scale(var(--scale))
        translate(var(--pos-x), var(--pos-y));
  }

  > svg.links > g {
    transform:
        scale(var(--scale))
        translate(var(--pos-x), var(--pos-y));
  }

  > svg.links {
    stroke: currentcolor;
    stroke-width: 2px;

    pointer-events: none;

    > g > .new-link {
      opacity: 0.5;
    }
  }
}
</style>$/util$/node/