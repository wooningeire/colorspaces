<script lang="ts" setup>
import {tree, selectedNodes} from "./store";
</script>

<template>
	<div class="toolbar">
		<button @click="selectedNodes.forEach(tree.deleteNode, tree)">Delete</button>
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