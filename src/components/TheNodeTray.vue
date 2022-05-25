<script lang="ts" setup>
import {models, math, spaces, images, organization} from "@/models/nodetypes";

import {isDraggingNodeFromNodeTray, currentlyDraggedNodeConstructor} from "./store";

const emit = defineEmits(["add-node"]);

const labels = new Map<object, string>([
	[models, "Models"],
	[spaces, "Spaces"],
	[math, "Math"],
	[images, "Images"],
	[organization, "Other"],
]);
</script>

<template>
	<div class="node-tray">
		<template v-for="nodeNamespace of [models, spaces, math, images, organization]">
			<div class="node-category-label">
				{{labels.get(nodeNamespace)}}
			</div>

			<div class="button-rack">
				<button v-for="nodeConstructor of Object.values(nodeNamespace)"
						@click="emit('add-node', nodeConstructor)"
						
						draggable="true"
						@dragstart="event => {
							currentlyDraggedNodeConstructor = nodeConstructor;
							isDraggingNodeFromNodeTray = true;
						}"
						@dragend="isDraggingNodeFromNodeTray = false">
					{{nodeConstructor.LABEL}}
				</button>
			</div>
		</template>

		<Teleport to="body">

		</Teleport>
	</div>
</template>

<style lang="scss" scoped>
.node-tray {
	height: 100%;

	padding: 2em;
	margin-right: 2em;

	display: grid;
	grid-template-columns: auto 1fr;
	gap: 0 1.5em;

	background: #000000cf;
	border-radius: 2em 2em 0 0;
	border: solid #aebf80;
	border-width: 4px 4px 0 4px;
	box-shadow: 0 4px 40px #0000003f;

	.node-category-label {
		text-transform: uppercase;
		font-size: 0.8em;

		display: flex;
		flex-flow: row;
		justify-content: end;
		align-items: center;
		text-align: right;
	}


	.button-rack {
		display: flex;
		flex-flow: row;
		gap: 0.5em;

		button {
			background: none;
			border: none;
			color: #ffffff7f;

			font-size: 1em;

			&:hover {
				background: #ffffff3f;
				color: #fff;
			}
		}
	}
}
</style>