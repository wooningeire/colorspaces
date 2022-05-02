<template>
	<div class="node" :style="{'left': `${node.pos[0] ?? 0}px`, 'top': `${node.pos[1] ?? 0}px`}">
		<div class="node-content">
			{{node.label}}
		</div>

		<div class="in-sockets">
			<BaseSocket v-for="socket of node.ins"
					:key="socket.label"
					:socket="socket"
					:draggingSocket="draggingSocket"
					@link-to-socket="socketVue => $emit('link-to-socket', socketVue)" />
		</div>

		<div class="out-sockets">
			<BaseSocket v-for="socket of node.outs"
					:key="socket.label"
					:socket="socket"
					:draggingSocket="draggingSocket"
					@drag-socket="socketVue => $emit('drag-socket', socketVue)" />
		</div>
	</div>
</template>

<script lang="ts">
import {defineComponent} from "vue";
import BaseSocket from "./BaseSocket.vue";
import {Node, Socket} from "../models/Node";

export default defineComponent({
	name: "BaseNode",

	props: {
		node: {
			type: Node,
			required: true,
		},

		draggingSocket: {
			type: Boolean,
			required: true,
		},
	},

	components: {
		BaseSocket,
	},
});
</script>

<style lang="scss" scoped>
.node {
	position: absolute;
	// display: inline grid;
	display: inline flex;
	flex-direction: column;
	border: 1px solid;

	width: 160px;

	// grid-template-areas:
	// 		"A A"
	// 		"B C";
	// gap: 0.5em;

	// > .node-content {
	// 	grid-area: A;
	// }
}
</style>