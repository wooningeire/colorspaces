<script lang="ts" setup>
import {computed, ref, reactive, provide, nextTick, onMounted, Ref, inject} from "vue";

import NodeVue from "./NodeVue.vue";
import NodeSocket from "./NodeSocket.vue";
import TheNodeTreeLinks from "./TheNodeTreeLinks.vue";

import {Vec2, Listen, clearTextSelection} from "@/util";
import {Socket, Node} from "@/models/Node";

import {tree, selectedNodes, modifierKeys, isDraggingNodeFromNodeTray, currentlyDraggedNodeConstructor, DeviceNodes} from "./store";


const pointerX = ref(-1);
const pointerY = ref(-1);

const viewportPos = inject("treeViewportPos") as number[];
const viewportScale = inject("treeViewportScale") as Ref<number>;
const screenToViewport = inject("screenToViewport") as (screenPos: number[]) => number[];

addEventListener("keydown", event => {
	if (event.key !== "Home") return;
	Object.assign(viewportPos, [0, 0]);
	viewportScale.value = 1;
});

const onWheel = (event: WheelEvent) => {
	viewportScale.value *= 1.125**-Math.sign(event.deltaY);
};


provide("tree", tree);



const socketVues = new WeakMap<Socket, InstanceType<typeof NodeSocket>>();
provide("socketVues", socketVues);

const draggedSocketVue = ref(null as InstanceType<typeof NodeSocket> | null);

const draggedSocket = computed(() => draggedSocketVue.value?.socket);
const draggingSocket = computed(() => Boolean(draggedSocketVue.value));

provide("draggedSocket", draggedSocket);
provide("draggingSocket", draggingSocket);


const onDragSocket = (socketVue: InstanceType<typeof NodeSocket>) => {
	draggedSocketVue.value = socketVue;

	[pointerX.value, pointerY.value] = draggedSocketVue.value.socketPos();

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
	// preemptive + stops TypeScript complaint
	if (!draggedSocket.value) throw new TypeError("Not currently dragging from a socket");

	if (draggedSocket.value.isInput) {
		tree.linkSockets(socketVue.socket, draggedSocket.value);
	} else {
		tree.linkSockets(draggedSocket.value, socketVue.socket);
	}
};



const linksComponent = ref(null as InstanceType<typeof TheNodeTreeLinks> | null);

const rerenderLinks = () => {
	// Delay to next tick because socket positions in DOM have not updated yet
	nextTick(() => {
		linksComponent.value?.$forceUpdate();
	});
};

onMounted(rerenderLinks);


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


const beginDragCamera = (event: PointerEvent) => {
	const startPos = [...viewportPos];
	const pointerStartPos = [event.pageX, event.pageY];

	const moveListener = Listen.for(window, "pointermove", (moveEvent: PointerEvent) => {
		clearTextSelection();

		[viewportPos[0], viewportPos[1]] = [
			startPos[0] + (moveEvent.pageX - pointerStartPos[0]) / viewportScale.value,
			startPos[1] + (moveEvent.pageY - pointerStartPos[1]) / viewportScale.value,
		];
	});

	addEventListener("pointerup", () => {
		moveListener.detach();
	}, {once: true});
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
			@drop="event => isDraggingNodeFromNodeTray && $emit('add-node', currentlyDraggedNodeConstructor, [event.pageX, event.pageY])"

			@pointerdown.self="onPointerDownSelf"
			@pointerdown="event => event.button === 1 && beginDragCamera(event)"
			@wheel.passive="onWheel"
			
			:style="{
				'--pos-x': `${viewportPos[0]}px`,
				'--pos-y': `${viewportPos[1]}px`,
				'--scale': `${viewportScale}`,
			} as any">
		<div class="nodes">
			<NodeVue v-for="node of tree.nodes"
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
			<g>
				<line v-if="draggingSocket"
						class="new-link"
						:x1="(draggedSocketVue?.socketPos()[0] ?? 0)"
						:y1="(draggedSocketVue?.socketPos()[1] ?? 0)"
						:x2="pointerX"
						:y2="pointerY" />

				<TheNodeTreeLinks :socketVues="socketVues"
						ref="linksComponent" />
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
	}

	> .nodes,
	> svg {
		width: 100%;
		height: 100%;

		transform-origin: 0 0;
	}

	// For some reason, scaling will cause changes to getBoundingClientRect but not translate
	> .nodes {
		transform: scale(var(--scale)) translate(var(--pos-x), var(--pos-y));
	}

	> svg.links > g {
		transform: scale(var(--scale)) translate(var(--pos-x), var(--pos-y));
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
</style>