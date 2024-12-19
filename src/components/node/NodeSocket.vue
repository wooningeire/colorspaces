<script lang="ts" setup>
import {ref, inject, computed, onMounted, getCurrentInstance, ComputedRef, watch, reactive} from "vue";

import NodeSocketField from "./NodeSocketField.vue";
import NodeSocket from "./NodeSocket.vue";
import {tooltipController} from "@/components/store.svelte";

import {Socket, SocketType, InSocket} from "$/node/";
import getString, {NO_DESC} from "$/strings";


const socketVue = getCurrentInstance()!.proxy;


const props = defineProps<{
  socket: Socket,
}>();

// @ts-ignore
const emit = defineEmits<{
  (event: "field-value-change", requiresShaderReload: boolean, editedSocket: InSocket): void,
  (event: "drag-socket", socketVue: InstanceType<typeof NodeSocket>): void,
  (event: "link-to-socket", socketVue: InstanceType<typeof NodeSocket>): void,
  (event: "unlink"): void,
}>();


const draggedSocket = inject<ComputedRef<Socket | undefined>>("draggedSocket")!;
const isDraggedOver = ref(false);
const canLinkDraggedSocket = computed(() => Socket.canLink(draggedSocket?.value, props.socket));


const shouldShowFields = computed(() => props.socket.usesFieldValue);


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
    link.unlink();
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
      && Socket.canLinkTypes(src.type, dst.type)
      && props.socket.node.canEditLinks
      && draggedSocket.value.node.canEditLinks;
};


const socketTypeColors = new Map([
  [SocketType.Unknown, "#000"],
  [SocketType.DynamicAny, "#fff"],
  [SocketType.Float, "#aaa"],
  [SocketType.Bool, "#fbc"],
  [SocketType.Integer, "#6a6"],
  [SocketType.Vector, "#75d"],
  [SocketType.Color, "#dd3"],
  [SocketType.VectorOrColor, "linear-gradient(45deg, #75d 50%, #dd3 50%)"],
]);
const socketType = ref(props.socket.type);
const socketColor = computed(() => socketTypeColors.get(socketType.value) ?? "");
watch(props.socket, () => {
  socketType.value = props.socket.type;
});


const socketContainer = ref(null as HTMLDivElement | null);
const socketTypeNames = new Map(
  Object.entries(SocketType)
      .map(([key, value]) => [value, `${key[0].toLowerCase()}${key.substring(1)}`])
);
const showTooltip = () => {
  const rect = socketContainer.value!.getBoundingClientRect();

  const socketTypeName = socketTypeNames.get(props.socket.type);
  const inOut = props.socket.isInput ? "in" : "out";

  let tooltipString = `${getString(props.socket.desc ?? NO_DESC)}`;
  
  if (props.socket.showSocket) {
    tooltipString += `<br />
<br />
${getString("general.socketDataTypeLabel")}${getString(`label.socketType.${socketTypeName}`)}<br />
${getString(`desc.socketType.${socketTypeName}.${inOut}`)}`;
  }

  if (props.socket.constant) {
    tooltipString += `<br />
<br />
${getString("label.socketAttr.constant")}<br />
${getString(`desc.socketAttr.constant.${inOut}`)}`;
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

// for transition
const height = ref(0);
const nodeSocketFieldRef = ref<InstanceType<typeof NodeSocketField> | null>(null);
onMounted(() => {
  if (!shouldShowFields.value) return;
  height.value = nodeSocketFieldRef.value!.$el.clientHeight;
});
</script>

<template>
  <div
    class="socket-container"
    :class="{'in': socket.isInput}"
    ref="socketContainer"
    
    @pointerover="() => !draggedSocket && showTooltip()"
    @pointerout="tooltipController.hideTooltip()"
  >
    <div
      class="socket"
      v-if="socket.showSocket"

      ref="socketHitbox"
      draggable="true"
      @dragstart="event => (ondragstart(event), tooltipController.hideTooltip())"
      @dragenter.prevent
      @dragover.prevent="isDraggedOver = true"
      @drop="event => (ondrop(event), isDraggedOver = false)"
      @pointerdown="event => event.button === 0 && event.stopPropagation()"
      @dragleave="isDraggedOver = false"
      @dragend="event => (event.currentTarget as HTMLDivElement)?.blur()"

      @dblclick="unlinkLinks"
      
      :class="{
        hiding: Boolean(draggedSocket) && !canLinkDraggedSocket,
      }"
    >
      <div
        class="socket-display"
        :class="{
          constant: socket.constant,
          excited: Boolean(draggedSocket) && canLinkDraggedSocket,
          accepting: isDraggedOver && canLinkDraggedSocket,
        }"
        :style="{'--socket-color': socketColor} as any"
      ></div>
    </div>
    <div
      class="socket-label"
      v-html="getString(socket.label, ...socket.labelSubstitutions)"
    ></div>

    <Transition
      name="drawer"
      :style="{
        '--end-height': `-${height}px`,
      }"
      ref=""
    >
      <NodeSocketField
        v-if="shouldShowFields"
        :socket="socket"
        @value-change="(requiresShaderReload) => {
          socket.node.onSocketFieldValueChange(socket);
          $emit('field-value-change', requiresShaderReload, socket);
        }"
        ref="nodeSocketFieldRef"
      />
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.socket-container {
  position: relative;
  margin-bottom: .25em;

  padding: 0 var(--socket-text-padding);

  min-height: 1.5em;

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
      background: var(--socket-color);
      box-shadow: 0 0 0 #fff, var(--main-border-box-shadow);
      
      transition: width var(--socket-size-transition-time) var(--socket-size-ease),
          height var(--socket-size-transition-time) var(--socket-size-ease),
          box-shadow .1s ease;

      --socket-color: currentcolor;
      --main-border-box-shadow: 0 0 0 4px #2f3432;

      &:not(.constant) {
        border-radius: 50%;
      }

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


  // vue transition
  > .drawer-enter-active {
    animation: drawer .125s cubic-bezier(0,.74,.55,1);
  }

  > .drawer-leave-active {
    pointer-events: none;
    animation: drawer .125s cubic-bezier(.45,0,1,.26) reverse;
  }

  @keyframes drawer {
    0% {
      transform: scaleY(0);
      margin-bottom: var(--end-height);
    }

    100% {
      margin-bottom: 0;
    }
  }
}
</style>