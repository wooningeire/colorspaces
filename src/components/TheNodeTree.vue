<template>
	<div class="node-tree">
		<div class="nodes">
			<BaseNode v-for="node of tree.nodes"
					:key="node.id"
					:node="node"
					@drag-socket="onDragSocket"
					@link-to-socket="onLinkToSocket"

					@tree-update="recomputeOutputColor"
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

			<line v-for="link of tree.links"
					:key="link.id"
					:x1="getSocketVue(link.src)?.socketPos()[0]"
					:y1="getSocketVue(link.src)?.socketPos()[1]"
					:x2="getSocketVue(link.dst)?.socketPos()[0]"
					:y2="getSocketVue(link.dst)?.socketPos()[1]" />
		</svg>
	</div>
</template>

<script lang="ts">
import {defineComponent, computed} from "vue";
import BaseNode from "./BaseNode.vue";
import BaseSocket from "./BaseSocket.vue";
import {Tree, Socket} from "../models/Node";
import {rgbModels, spaces, externals} from "../models/nodetypes";
import {Vec2, Listen, Color} from "../util";

export default defineComponent({
	name: "TheNodeTree",

	data: () => (<{
		pos: Vec2,
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
		deviceNodes: {
			// set in `created`
		},

		draggedSocketVue: null,
		socketVues: new WeakMap(),

		pointerX: -1,
		pointerY: -1,
	}),

	props: {
		tree: {
			type: Tree,
			required: true,
		},
	},

	provide() {
		return {
			draggedSocket: computed(() => this.draggedSocket),
			draggingSocket: computed(() => this.draggingSocket),
			tree: this.tree,
		};
	},

	methods: {
		srgbOutput() {
			const resultSocket = this.deviceNodes.transformNode.ins[0];

			for (const link of resultSocket.links) {
				if (link.src.type !== Socket.Type.ColTransformed) continue;
				return link.src.node.output();
			}

			return [1, 1, 1];
		},

		//#region Events
		rerenderLinks() {
			// This is just so the links get rerendered... certainly can be more efficient
			this.$forceUpdate();
		},

		onDragSocket(socketVue: InstanceType<typeof BaseSocket>) {
			this.draggedSocketVue = socketVue;
			this.socketVues.set(socketVue.socket, socketVue);

			[this.pointerX, this.pointerY] = this.draggedSocketVue.socketPos();

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
		},
		//#endregion

		getSocketVue(socket: Socket) {
			return this.socketVues.get(socket);
		},

		recomputeOutputColor() {
			const displayColor = this.srgbOutput() as Color;
			console.log(displayColor);
			this.deviceNodes.transformNode.displayColor = displayColor;
		},
	},

	computed: {
		draggedSocket() {
			return this.draggedSocketVue?.socket;
		},

		draggingSocket() {
			return Boolean(this.draggedSocketVue);
		},
	},

	created() {
		this.tree.nodes.push(
			new rgbModels.HsvNode([50, 200]),
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