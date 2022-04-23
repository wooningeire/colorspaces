<template>
	<div class="node">
	</div>
</template>

<script lang="ts">
import {defineComponent} from "vue";
import {Node} from "../models/Node";

export default defineComponent({
	name: "Node",

	props: {
		node: Node
	},
});
</script>

<style lang="scss" scoped>
</style>