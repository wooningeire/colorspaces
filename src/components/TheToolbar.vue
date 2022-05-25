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
		<button @click="deleteSelectedNodes">Delete</button>
	</div>
</template>

<style lang="scss">
.toolbar {
	margin: 0 2em;
	height: 100%;

	display: flex;
	align-items: start;

	z-index: 1;
}
</style>