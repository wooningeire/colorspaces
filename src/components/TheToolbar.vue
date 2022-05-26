<script lang="ts" setup>
import {tree, selectedNodes} from "./store";

const deleteSelectedNodes = () => {
	selectedNodes.forEach(node => {
		if (!node.canMove) return;
		tree.deleteNode(node);
	});
};
</script>

<template>
	<div class="toolbar">
		<button @click="deleteSelectedNodes">Delete selected nodes</button>
	</div>
</template>

<style lang="scss">
.toolbar {
	margin: 0 1em;
	// height: 100%;

	display: flex;
	align-self: start;
	flex-flow: column;
	box-shadow: 0 4px 40px #0000003f;

	z-index: 1;

	background: #000000cf;
	border-radius: 0.5em;
	overflow: hidden;

	button {
		background: none;
		border: none;
		color: #ffffff7f;

		padding: 0.5em;

		&:hover {
			background: #ffffff3f;
			color: #fff;
		}
	}
}
</style>