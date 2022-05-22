<script lang="ts" setup>
import {computed, PropType, inject, ref, reactive, provide, Ref} from "vue";

import BaseNode from "./BaseNode.vue";
import BaseSocket from "./BaseSocket.vue";
import BaseLinks from "./BaseLinks.vue";

import {Vec2, Listen, Color, clearTextSelection} from "@/util";
import {Tree, Socket, Node} from "@/models/Node";

import {tree, deviceNodes, selectedNodes, modifierKeys, isDraggingNodeFromNodeTray, currentlyDraggedNodeConstructor, DeviceNodes} from "./store";


const pos = reactive([0, 0]);

const pointerX = ref(-1);
const pointerY = ref(-1);


provide("tree", tree);



const socketVues = new WeakMap<Socket, InstanceType<typeof BaseSocket>>();
provide("socketVues", socketVues);

const draggedSocketVue = ref(null as InstanceType<typeof BaseSocket> | null);

const draggedSocket = computed(() => draggedSocketVue.value?.socket);
const draggingSocket = computed(() => Boolean(draggedSocketVue.value));

provide("draggedSocket", draggedSocket);
provide("draggingSocket", draggingSocket);


const onDragSocket = (socketVue: InstanceType<typeof BaseSocket>) => {
	draggedSocketVue.value = socketVue;

	[pointerX.value, pointerY.value] = draggedSocketVue.value.socketPos();

	const dragListener = Listen.for(window, "dragover", (event: DragEvent) => {
		pointerX.value = event.pageX;
		pointerY.value = event.pageY;
	});

	socketVue.socketEl.addEventListener("dragend", () => {
		draggedSocketVue.value = null;

		dragListener.detach();
	}, {once: true});
};

const onLinkToSocket = (socketVue: InstanceType<typeof BaseSocket>) => {
	// preemptive + stops TypeScript complaint
	if (!draggedSocket.value) throw new TypeError("Not currently dragging from a socket");

	if (draggedSocket.value.isInput) {
		tree.linkSockets(socketVue.socket, draggedSocket.value);
	} else {
		tree.linkSockets(draggedSocket.value, socketVue.socket);
	}
};



const linksComponent = ref(null as any as InstanceType<typeof BaseLinks>);

const rerenderLinks = () => {
	linksComponent.value.$forceUpdate();
};


const selectNode = (node: Node, clearSelection: boolean=true) => {
	if (clearSelection) {
		selectedNodes.clear();
	}
	selectedNodes.add(node);

	// For layering purposes — places node at top
	// this.tree.nodes.delete(node);
	// this.tree.nodes.add(node);
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


defineExpose({
	selectNode,
});

/* srgbOutput() {
	const resultSocket = this.deviceNodes.transformNode.ins[0];

	for (const link of resultSocket.links) {
		if (link.src.type !== Socket.Type.ColTransformed) continue;
		return link.src.node.output();
	}

	return [1, 1, 1];
}, */

// recomputeOutputColor() {
// 	const displayColor = this.srgbOutput() as Color;
// },
</script>

<template>
	<!-- drag events here are from node tray -->
	<div class="node-tree"
			@dragover="event => isDraggingNodeFromNodeTray && event.preventDefault()"
			@drop="isDraggingNodeFromNodeTray && $emit('add-node', currentlyDraggedNodeConstructor)">
		<div class="nodes"
				@pointerdown.self="onPointerDownSelf">
			<BaseNode v-for="node of tree.nodes"
					:key="node.id"
					:node="node"
					@drag-socket="onDragSocket"
					@link-to-socket="onLinkToSocket"
					@node-selected="selectNode"

					@tree-update="void 0/* recomputeOutputColor */"
					@potential-socket-position-change="rerenderLinks" />
		</div>

		<svg class="links"
				:viewbox="`0 0 ${$el?.clientWidth ?? 300} ${$el?.clientHeight ?? 150}`">
			<line v-if="draggingSocket"
					class="new-link"
					:x1="draggedSocketVue?.socketPos()[0]"
					:y1="draggedSocketVue?.socketPos()[1]"
					:x2="pointerX"
					:y2="pointerY" />

			<BaseLinks :socketVues="socketVues"
					ref="linksComponent" />
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
	
	> * {
		grid-area: 1 / 1;
	}

	> .nodes,
	> svg {
		width: 100%;
		height: 100%;
	}

	> svg.links {
		stroke: currentcolor;
		stroke-width: 2px;

		pointer-events: none;

		> .new-link {
			opacity: 0.5;
		}
	}
}
</style>