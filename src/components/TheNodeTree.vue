<template>
	<div class="node-tree">
		<div class="nodes">
			<BaseNode v-for="node of tree.nodes"
					:key="node.id"
					:node="node" />
		</div>
	</div>
</template>

<script lang="ts">
import {defineComponent} from "vue";
import BaseNode from "./BaseNode.vue";
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
	}>{
		pos: [0, 0],
		tree: new Tree(),
		deviceNodes: {
			// set in `created`
		},
	}),

	methods: {
		parseTree() {
			const resultSocket = this.deviceNodes.transformNode.ins[0];

			for (const link of resultSocket.links) {
				if (link.src.type !== Socket.Type.COL_TRANSFORMED) continue;
				return link.src.node.rgbOutput();
			}
		},
	},

	created() {
		this.tree.nodes.push(
			new spaces.SrgbNode([50, 50]),
			(this.deviceNodes.transformNode = new externals.DeviceTransformNode([400, 100])),
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

	> .nodes {
		width: 100%;
		height: 100%;
	}
}
</style>