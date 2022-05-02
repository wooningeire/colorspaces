<template>
	<div class="node" :style="{'left': `${node.pos[0] ?? 0}px`, 'top': `${node.pos[1] ?? 0}px`}">
		<div class="node-content">
			<div class="label">
				{{node.label}}
			</div>
		</div>

		<div class="in-sockets">
			<BaseSocket v-for="socket of node.ins"
					:key="socket.label"
					:socket="socket"
					:draggedSocket="draggedSocket"
					@drag-socket="socketVue => $emit('drag-socket', socketVue)"
					@link-to-socket="socketVue => $emit('link-to-socket', socketVue)" />
		</div>

		<div class="out-sockets">
			<BaseSocket v-for="socket of node.outs"
					:key="socket.label"
					:socket="socket"
					:draggedSocket="draggedSocket"
					@drag-socket="socketVue => $emit('drag-socket', socketVue)"
					@link-to-socket="socketVue => $emit('link-to-socket', socketVue)" />
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

		draggedSocket: {
			type: Socket,
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
	border: 4px solid;
	width: 160px;
	padding-bottom: 1em;

	border-radius: 1em;
	background: #2f352caf;
	box-shadow: 0 4px 40px #0000003f;

	// grid-template-areas:
	// 		"A A"
	// 		"B C";
	// gap: 0.5em;

	// > .node-content {
	// 	grid-area: A;
	// }

	> .node-content {
		margin-bottom: 0.5em;

		> .label {
			text-align: center;
			padding: 0 0.25em;
			font-weight: 800;
		}
	}
}
</style>