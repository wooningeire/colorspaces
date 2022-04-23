<template>
	<div class="node-tree">
	</div>
</template>

<script lang="ts">
import {defineComponent} from "vue";

export default defineComponent({
	name: "NodeTree",

	data: () => ({
		pos: [0, 0]
	}),
});
</script>

<style lang="scss" scoped>
.node-tree {
	position: relative;
}
</style>