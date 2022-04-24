<template>
	<div class="node" :style="{'left': `${node.pos[0]}px`, 'top': `${node.pos[1]}px`}">
		<div class="node-content">
			{{node.label}}
		</div>

		<div class="in-sockets">
			ins
		</div>

		<div class="out-sockets">
			outs
		</div>
	</div>
</template>

<script lang="ts">
import {defineComponent} from "vue";
import {Node} from "../models/Node";

export default defineComponent({
	name: "BaseNode",

	props: {
		node: {
			type: Node,
			required: true,
		},
	},
});
</script>

<style lang="scss" scoped>
.node {
	position: absolute;
	display: inline grid;
	border: 1px solid;

	grid-template-areas:
			"A A"
			"B C";
	gap: 0.5em;

	> .node-content {
		grid-area: A;
	}
}
</style>