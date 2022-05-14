<template>
	<div class="node-tree">
		<div class="nodes">
			<BaseNode v-for="node of tree.nodes"
					:key="node.id"
					:node="node"
					:draggedSocket="draggedSocket"
					@drag-socket="onDragSocket"
					@link-to-socket="onLinkToSocket" />
		</div>

		<svg class="links"
				:viewbox="`0 0 ${$el?.clientWidth ?? 300} ${$el?.clientHeight ?? 150}`">
			<line v-if="draggingSocket"
					class="new-link"
					:x1="draggedSocketX"
					:y1="draggedSocketY"
					:x2="pointerX"
					:y2="pointerY" />

			<line v-for="link of tree.links"
					:x1="socketX(link.src)"
					:y1="socketY(link.src)"
					:x2="socketX(link.dst)"
					:y2="socketY(link.dst)" />
		</svg>
	</div>
</template>

<script lang="ts">
import {defineComponent} from "vue";
import BaseNode from "./BaseNode.vue";
import BaseSocket from "./BaseSocket.vue";
import {Tree, Socket} from "../models/Node";
import {rgbModels, spaces, externals} from "../models/nodetypes";
import {Vec2, Listen, Color} from "../util";

export default defineComponent({
	name: "TheNodeTree",

	data: () => (<{
		pos: Vec2,
		tree: Tree,
		deviceNodes: {
			transformNode: externals.DeviceTransformNode,
			// postprocessingNode: externals.DevicePostprocessingNode,
			// visionNode: externals.VisionNode,
		},

		draggedSocketVue: InstanceType<typeof BaseSocket> | null,
		socketVues: WeakMap<Socket, InstanceType<typeof BaseSocket>>,

		pointerX: number,
		pointerY: number,
	}>{
		pos: [0, 0],
		tree: new Tree(),
		deviceNodes: {
			// set in `created`
		},

		draggedSocketVue: null,
		socketVues: new WeakMap(),

		pointerX: -1,
		pointerY: -1,
	}),

	methods: {
		srgbOutput() {
			const resultSocket = this.deviceNodes.transformNode.ins[0];

			for (const link of resultSocket.links) {
				if (link.src.type !== Socket.Type.ColTransformed) continue;
				return link.src.node.output();
			}

			console.warn("Reaching placeholder area");
			return [1, 1, 1];
		},

		//#region Events
		onDragSocket(socketVue: InstanceType<typeof BaseSocket>) {
			this.draggedSocketVue = socketVue;
			this.socketVues.set(socketVue.socket, socketVue);

			this.pointerX = this.draggedSocketX;
			this.pointerY = this.draggedSocketY;

			const dragListener = Listen.for(window, "dragover", (event: DragEvent) => {
				this.pointerX = event.pageX;
				this.pointerY = event.pageY;
			});

			socketVue.socketEl.addEventListener("dragend", () => {
				this.draggedSocketVue = null;

				dragListener.detach();
			}, {once: true});
		},

		onLinkToSocket(socketVue: InstanceType<typeof BaseSocket>) {
			this.socketVues.set(socketVue.socket, socketVue);
			
			// preemptive + stops TypeScript complaint
			if (!this.draggedSocket) throw new TypeError("Not currently dragging from a socket");

			if (this.draggedSocket.isInput) {
				this.tree.linkSockets(socketVue.socket, this.draggedSocket);
			} else {
				this.tree.linkSockets(this.draggedSocket, socketVue.socket);
			}

			// TODO
			if ([socketVue.socket.node, this.draggedSocket.node].includes(this.deviceNodes.transformNode)) {
				this.updateDisplay();
			}
		},
		//#endregion

		socketX(socket: Socket) {
			return this.rectCenterX(this.socketRect(socket));
		},

		socketY(socket: Socket) {
			return this.rectCenterY(this.socketRect(socket));
		},

		socketRect(socket: Socket) {
			return this.socketVues.get(socket)?.socketEl?.getBoundingClientRect();
		},

		rectCenterX(rect: DOMRect) {
			// if (!rect) return 0;
			return (rect.left + rect.right) / 2;
		},

		rectCenterY(rect: DOMRect) {
			// if (!rect) return 0;
			return (rect.top + rect.bottom) / 2;
		},

		updateDisplay() {
			const displayColor = this.srgbOutput() as Color;
			console.log(displayColor);
			this.deviceNodes.transformNode.displayColor = displayColor;
		},
	},

	computed: {
		draggedSocket() {
			return this.draggedSocketVue?.socket;
		},

		draggedSocketX() {
			return this.rectCenterX(this.draggedSocketVue?.socketEl?.getBoundingClientRect());
		},

		draggedSocketY() {
			return this.rectCenterY(this.draggedSocketVue?.socketEl?.getBoundingClientRect());
		},

		draggingSocket() {
			return Boolean(this.draggedSocketVue);
		},
	},

	created() {
		this.tree.nodes.push(
			new rgbModels.RgbNode([50, 200]),
			new spaces.SrgbNode([450, 50]),
			new spaces.LinearNode([450, 250]),
			new spaces.XyzNode([450, 450]),
			(this.deviceNodes.transformNode = new externals.DeviceTransformNode([800, 100])),
		);
	},

	components: {
		BaseNode,
	},
});
</script>

<style lang="scss" scoped>
.node-tree {
	position: relative;
	width: 100%;
	height: 100%;

	display: grid;
	place-items: center;
	
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