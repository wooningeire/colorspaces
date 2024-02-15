<script lang="ts" setup>
import {ref, inject, computed, onMounted, getCurrentInstance, ComputedRef, watch} from "vue";

import NodeSocketField from "./NodeSocketField.vue";
import NodeSocket from "./NodeSocket.vue";
import {tree, tooltipController} from "./store";

import {Tree, Socket, SocketType as St} from "@/models/Node";
import getString, {NO_DESC} from "@/strings";


const socketVue = getCurrentInstance()!.proxy;


const props = defineProps({
  socket: {
    type: Socket,
    required: true,
  },
});

const emit = defineEmits<{
  (event: "value-change"): void,
  (event: "drag-socket", socketVue: InstanceType<typeof NodeSocket>): void,
  (event: "link-to-socket", socketVue: InstanceType<typeof NodeSocket>): void,
  (event: "unlink"): void,
}>();

const draggedSocket = inject<ComputedRef<Socket>>("draggedSocket");
const isDraggedOver = ref(false);
const canLinkDraggedSocket = computed(() => Socket.canLink(draggedSocket?.value, props.socket));


const shouldShowFields = computed(
  () => props.socket.isInput
      && (!props.socket.hasLinks || props.socket.links[0].causesCircularDependency)
);


const socketVues = inject("socketVues") as WeakMap<Socket, InstanceType<typeof NodeSocket>>;
onMounted(() => {
  socketVues.set(props.socket, socketVue);
});

const socketHitbox = ref(null as HTMLDivElement | null);
const socketEl = computed(() => socketHitbox.value);

const screenToViewport = inject("screenToViewport") as (screenPos: number[]) => number[];

const rect = () => socketEl.value!.getBoundingClientRect();

const socketPos = () => screenToViewport([
  (rect().left + rect().right) / 2,
  (rect().top + rect().bottom) / 2,
]);


const unlinkLinks = () => {
  props.socket.links.forEach(link => {
    if (!link.srcNode.canEditLinks || !link.dstNode.canEditLinks) return;
    tree.unlink(link);
  });
  emit("unlink");
};



const ondragstart = (event: DragEvent) => {
  if (!props.socket.node.canEditLinks) {
    event.preventDefault();
    return;
  }

  event.dataTransfer!.dropEffect = "link";
  event.dataTransfer!.setDragImage(document.createElement("div"), 0, 0);
  emit("drag-socket", socketVue);
};
const ondrop = (event: DragEvent) => {
  if (willAcceptLink()) {
    emit("link-to-socket", socketVue);
  }
};
const willAcceptLink = () => {
  // preemptive + stops TypeScript complaint
  if (!draggedSocket.value) throw new TypeError("Not currently dragging from a socket");

  const [src, dst] = props.socket.isOutput
      ? [props.socket, draggedSocket.value]
      : [draggedSocket.value, props.socket];

  return props.socket.isInput !== draggedSocket.value.isInput
      && props.socket.node !== draggedSocket.value.node
      && Socket.canLinkTypeTo(src.type, dst.type)
      && props.socket.node.canEditLinks
      && draggedSocket.value.node.canEditLinks;
};


const socketTypeColors = new Map([
  [St.Float, "#aaa"],
  [St.Vector, "#75d"],
  [St.ColorCoords, "#dd3"],
  [St.VectorOrColor, "linear-gradient(45deg, #75d 50%, #dd3 50%)"],
]);
const socketColor = computed(() => socketTypeColors.get(props.socket.type) ?? "");



const socketContainer = ref(null as HTMLDivElement | null);
const socketTypeNames = new Map(
  Object.entries(St)
      .map(([key, value]) => [value, `${key[0].toLowerCase()}${key.substring(1)}`])
);
const showTooltip = () => {
  const rect = socketContainer.value!.getBoundingClientRect();

  const socketTypeName = socketTypeNames.get(props.socket.type);

  let tooltipString = `${getString(props.socket.data.socketDesc ?? NO_DESC)}`;
  
  if (props.socket.showSocket) {
    tooltipString += `<br />
<br />
${getString("general.socketDataTypeLabel")}${getString(`label.socketType.${socketTypeName}`)}<br />
${getString(`desc.socketType.${socketTypeName}.${props.socket.isInput ? "in" : "out"}`)}`;
  }

  if (props.socket.showSocket && props.socket.hasLinks) {
    tooltipString += `<br />
<br />    
${getString("general.socketUnlinkTutorial")}`;
  }

  tooltipController.showTooltip(tooltipString, {
    left: `calc(${rect.right}px + 1em)`,
    top: `${rect.top}px`,
  });
};


defineExpose({
  socketEl,
  socketPos,
});

Object.defineProperties(socketVue, {
  socketEl: {
    value: socketEl,
  },
  socketPos: {
    value: socketPos,
  },
});

</script>

<template>
  <div class="socket-container"
      :class="{'in': socket.isInput}"
      ref="socketContainer"
      
      @pointerover="() => !draggedSocket && showTooltip()"
      @pointerout="tooltipController.hideTooltip()">
    <div class="socket"
        v-if="socket.showSocket"

        ref="socketHitbox"
        draggable="true"
        @dragstart="event => (ondragstart(event), tooltipController.hideTooltip())"
        @dragenter.prevent
        @dragover.prevent="isDraggedOver = true"
        @drop="event => (ondrop(event), isDraggedOver = false)"
        @pointerdown="event => event.button === 0 && event.stopPropagation()"
        @dragleave="isDraggedOver = false"
        @dragend="event => event.currentTarget?.blur()"

        @dblclick="unlinkLinks"
        
        :class="{
          hiding: Boolean(draggedSocket) && !canLinkDraggedSocket,
        }">
      <div class="socket-display"
          :class="{
						excited: Boolean(draggedSocket) && canLinkDraggedSocket,
            accepting: isDraggedOver && canLinkDraggedSocket,
          }"
          :style="{'--socket-color': socketColor} as any"></div>
    </div>
    <div class="socket-label">
      {{socket.label}}
    </div>

    <NodeSocketField v-if="shouldShowFields"
        :socket="socket"
        @value-change="socket.node.onSocketFieldValueChange(socket, tree as Tree)" />
  </div>
</template>

<style lang="scss" scoped>
.socket-container {
  position: relative;
  margin-bottom: .25em;

  padding: 0 var(--socket-text-padding);

  min-height: 1.5em;

  --socket-text-padding: 8px;

  > .socket {
    --socket-box-size: 20px;
    --socket-size: 12px;
    --socket-offset: -12px;
    --socket-size-ease: cubic-bezier(.23, 2, .5, 1);
    --socket-size-transition-time: .2s;

    width: var(--socket-box-size);
    height: var(--socket-box-size);
    position: absolute;
    top: 0em;
    bottom: 0.5em;

    display: grid;
    place-items: center;

    cursor: crosshair;

    &:hover {
      --socket-size: 16px;
    }

    &:active {
      --socket-size: 8px;
      --socket-size-ease: ease;
      --socket-size-transition-time: .1s;
    }
    
    > .socket-display {
      width: var(--socket-size);
      height: var(--socket-size);

      border-radius: 50%;
      background: var(--socket-color);
      box-shadow: 0 0 0 #fff, var(--main-border-box-shadow);
      
      transition: width var(--socket-size-transition-time) var(--socket-size-ease),
          height var(--socket-size-transition-time) var(--socket-size-ease),
          box-shadow .1s ease;

      --socket-color: currentcolor;
      --main-border-box-shadow: 0 0 0 4px #2f3432;

			&.excited {
				--socket-size: 16px;
			}

      &.accepting {
        box-shadow: 0 0 0 2px #fff,
            var(--main-border-box-shadow);
      }
    }

    &.hiding {
      pointer-events: none;
    }

    &:not(:active).hiding > .socket-display {
      --socket-size: 0;
    }
  }

  &.in {

    > .socket {
      left: var(--socket-offset);
    }
  }

  &:not(.in) {
    text-align: right;

    > .socket {
      right: var(--socket-offset);
    }
  }
}
</style>