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
import {Tree} from "../models/Node";
import {colorModelNodes} from "../models/nodetypes";

export default defineComponent({
	name: "TheNodeTree",

	data: () => ({
		pos: [0, 0],
		tree: new Tree(),
	}),

	components: {
		BaseNode,
	},

	created() {
		this.tree.nodes.push(new colorModelNodes.RgbNode());
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