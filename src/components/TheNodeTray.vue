<script lang="ts" setup>
import {rgbModels, math, spaces} from "@/models/nodetypes";

const emit = defineEmits(["add-node"]);
</script>

<template>
	<div class="node-tray">
		<div v-for="nodeConstructor of [...Object.values(rgbModels), ...Object.values(math), ...Object.values(spaces)]"
				@click="emit('add-node', nodeConstructor)">
			{{nodeConstructor.LABEL}}
		</div>
	</div>
</template>

<style lang="scss" scoped>
.node-tray {
	height: 100%;

	padding: 2em;
	margin-right: 2em;

	background: #000000cf;
	border-radius: 2em 2em 0 0;
	border: solid #aebf80;
	border-width: 4px 4px 0 4px;
	box-shadow: 0 4px 40px #0000003f;

	cursor: pointer;
}
</style>