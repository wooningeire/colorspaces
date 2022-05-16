<script lang="ts" setup>

</script>

<template>
	<div class="toolbar">
		<button @click="$emit('delete-node')">Delete</button>
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