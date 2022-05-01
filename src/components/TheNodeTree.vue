<template>
	<div class="node-tree">
		<div class="nodes">
			<BaseNode v-for="node of tree.nodes"
					:key="node.id"
					:node="node"
					@focussocket="focussocket" />
		</div>

		<svg class="links"
				:viewbox="`0 0 ${$el?.clientWidth ?? 300} ${$el?.clientHeight ?? 150}`">
			<line v-if="focusedSocket"
					class="new-link"
					:x1="focusedSocketX"
					:y1="focusedSocketY"
					:x2="pointerX"
					:y2="pointerY" />
		</svg>
	</div>
</template>

<script lang="ts">
import {defineComponent} from "vue";
import BaseNode from "./BaseNode.vue";
import BaseSocket from "./BaseSocket.vue";
import {Tree, Socket} from "../models/Node";
import {spaces, externals} from "../models/nodetypes";
import {Vec2} from "../util";

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

		focusedSocketUi: InstanceType<typeof BaseSocket>,

		pointerX: number,
		pointerY: number,
	}>{
		pos: [0, 0],
		tree: new Tree(),
		deviceNodes: {
			// set in `created`
		},

		focusedSocketUi: null,

		pointerX: -1,
		pointerY: -1,
	}),

	methods: {
		parseTree() {
			const resultSocket = this.deviceNodes.transformNode.ins[0];

			for (const link of resultSocket.links) {
				if (link.src.type !== Socket.Type.COL_TRANSFORMED) continue;
				return link.src.node.rgbOutput();
			}
		},

		//#region Events
		focussocket(socketUi: InstanceType<typeof BaseSocket>) {
			this.focusedSocketUi = socketUi;
			console.log(this.focusedSocketUi);
		},
		//#endregion
	},

	computed: {
		focusedSocket() {
			return this.focusedSocketUi?.socket;
		},

		focusedSocketX() {
			const rect = this.focusedSocketUi?.socketEl?.getBoundingClientRect();
			if (!rect) return 0;

			return (rect.left + rect.right) / 2;
		},

		focusedSocketY() {
			const rect = this.focusedSocketUi?.socketEl?.getBoundingClientRect();
			if (!rect) return 0;

			return (rect.top + rect.bottom) / 2;
		},
	},

	created() {
		this.tree.nodes.push(
			new spaces.SrgbNode([50, 50]),
			(this.deviceNodes.transformNode = new externals.DeviceTransformNode([400, 100])),
		);
	},

	mounted() {
		addEventListener("pointermove", event => {
			this.pointerX = event.pageX;
			this.pointerY = event.pageY;
		});

		addEventListener("pointerup", () => {
			this.focusedSocketUi = null;
		});
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
		stroke: #000;
		stroke-width: 2px;
	}
}
</style>