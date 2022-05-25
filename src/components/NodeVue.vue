<script lang="ts" setup>
import {inject, computed} from "vue";

import NodeSocket from "./NodeSocket.vue";
import NodeField from "./NodeField.vue";
import NodeOutputValues from "./NodeOutputValues.vue";
import NodeOutputDisplay from "./NodeOutputDisplay.vue";

import {Node} from "@/models/Node";
import {rgbModels, spaces, math, images, externals} from "@/models/nodetypes";

import {Listen, clearTextSelection} from "@/util";

import {selectedNodes, modifierKeys} from "./store";


const props = defineProps({
	node: {
		type: Node,
		required: true,
	},
});


const emit = defineEmits([
	"drag-socket",
	"link-to-socket",
	"node-dragged",
	"potential-socket-position-change",
	"tree-update",
	"node-selected",
]);


const isSelected = computed(() => selectedNodes.has(props.node));



const startDragging = (event: PointerEvent) => {
	if (shouldCancelDrag(event)) return;
	
	const nodeStartPos = props.node.pos;
	const pointerStartPos = [event.pageX, event.pageY];

	const moveListener = Listen.for(window, "pointermove", (moveEvent: PointerEvent) => {
		clearTextSelection();

		props.node.pos = [
			nodeStartPos[0] + (moveEvent.pageX - pointerStartPos[0]),
			nodeStartPos[1] + (moveEvent.pageY - pointerStartPos[1]),
		];

		emit("node-dragged");
		emit("potential-socket-position-change");
	});

	addEventListener("pointerup", () => {
		moveListener.detach();
	}, {once: true});
};

const shouldCancelDrag = (event: PointerEvent) => {
	// Make this check more sophisticated
	// return event.target !== this.$el;
	return ["input", "select"].includes((event.target as Element).tagName.toLowerCase());
};

const emitNodeSelected = (event: PointerEvent) => {
	if (modifierKeys.shift) {
		clearTextSelection();
		// event.preventDefault();
	}

	emit("node-selected", props.node, !modifierKeys.shift);
};


const shouldDisplayOutput = computed(
	() => Object.values(spaces).includes(props.node.constructor as any),
);


const nodeCategories = new Map([rgbModels, spaces, math, images, externals]
		.map(category =>
				Object.values(category)
						.map(nodeType => [nodeType.TYPE, category]))
		.flat() as [symbol, unknown][]);


const nodeBorderColors = new Map<unknown, string>([
	[rgbModels, "linear-gradient(hsl(-20deg 40% 60%), hsl(30deg 40% 50%))"],
	[spaces, "linear-gradient(hsl(260deg 40% 60%), hsl(300deg 40% 60%))"],
	[math, "linear-gradient(hsl(50deg 40% 60%), hsl(90deg 40% 60%))"],
	[images, "linear-gradient(hsl(165deg 10% 50%), hsl(185deg 10% 60%))"],
	[externals, "linear-gradient(hsl(220deg 40% 50%), hsl(200deg 40% 50%))"],
]);
const nodeBackgroundColors = new Map<unknown, string>([
	[rgbModels, "hsl(-20deg 5% 20% / 0.8745)"],
	[spaces, "hsl(260deg 5% 20% / 0.8745)"],
	[math, "hsl(80deg 5% 20% / 0.8745)"],
	[images, "hsl(165deg 10% 20% / 0.8745)"],
	[externals, "hsl(220deg 25% 20% / 0.8745)"],
]);
const nodeCategory = computed(() => nodeCategories.get(props.node.type));
const nodeBorderColor = computed(() => nodeBorderColors.get(nodeCategory.value) ?? "#ffffff3f");
const nodeBackgroundColor = computed(() => nodeBackgroundColors.get(nodeCategory.value) ?? "#2e3331df");
</script>

<template>
	<div class="node"
			@pointerdown="event => {
				emitNodeSelected(event);
				startDragging(event);
			}"
			:style="{
				'left': `${node.pos[0] ?? 0}px`, 'top': `${node.pos[1] ?? 0}px`,
				'--node-border-background': nodeBorderColor,
				'--node-background': nodeBackgroundColor,
			} as any"
			:class="{
				'subtle': node instanceof externals.DevicePostprocessingNode
						|| node instanceof externals.EnvironmentNode
						|| node instanceof externals.VisionNode,
				'selected': isSelected,
			}">
		<div class="node-border"></div>

		<div class="label">
			{{node.label}}
		</div>

		<!-- <div class="node-content">
			<div class="fields">
				<NodeField v-for="field of node.fields"
						:key="field.id"
						:field="field" />
			</div>
		</div> -->

		<div class="in-sockets">
			<template v-for="(socket, index) of node.ins"
					:key="socket.id">
				<NodeOutputDisplay v-if="node instanceof externals.DeviceTransformNode
								&& socket.hasLinks"
						:node="node"
						:outputIndex="node.outputIndex(socket)" />

				<NodeSocket :socket="socket"
						@drag-socket="socketVue => $emit('drag-socket', socketVue)"
						@link-to-socket="socketVue => ($emit('link-to-socket', socketVue),
								$emit('tree-update'),
								$emit('potential-socket-position-change'))"

						@value-change="$emit('tree-update')"
						@unlink="$emit('tree-update'),
								$emit('potential-socket-position-change')" />
			</template>
		</div>

		<div class="out-sockets">
			<NodeSocket v-for="socket of node.outs"
					:key="socket.id"
					:socket="socket"
					@drag-socket="socketVue => $emit('drag-socket', socketVue)"
					@link-to-socket="socketVue => ($emit('link-to-socket', socketVue),
							$emit('tree-update'),
							$emit('potential-socket-position-change'))"

					@unlink="$emit('tree-update'),
							$emit('potential-socket-position-change')" />
		</div>

		<div class="node-output"
				v-if="shouldDisplayOutput">
			<!-- {{node.output().map((x: number) => x.toFixed(4))}} -->
			<NodeOutputValues :values="node.output()" />
			<NodeOutputDisplay :node="node" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
.node {
	position: absolute;
	// display: inline grid;
	display: flex;
	flex-direction: column;
	width: 140px;
	padding: 0.5em 0;

	background: var(--node-background);

	box-shadow: 0 4px 40px -20px #000000af;

	font-size: calc(14/16 * 1em);

	cursor: default;

	--node-border-background: linear-gradient(#9c20aa, #fb3570);
	--node-border-color: #ffffff3f;
	--node-background: #2e3331df;

	// grid-template-areas:
	// 		"A A"
	// 		"B C";
	// gap: 0.5em;

	// > .node-content {
	// 	grid-area: A;
	// }

	&.subtle {
		transition: 0.2s opacity ease;

		&:not(:hover) {
			opacity: 0.25;
		}
	}

	&.selected > .node-border {
		--node-border-background: #80efff;
	}

	> .label {
		position: absolute;
		bottom: calc(100% + 0.25em);

		// text-align: center;
		padding: 0 0.25em;
		// font-weight: 800;

		// pointer-events: none;
	}

	> .node-content {
		margin-bottom: 0.5em;

		> .fields {
			display: flex;
			flex-flow: column;
		}
	}

	> .in-sockets :deep(.color-display-box) {
		position: absolute;
		right: .5em;
		height: 1em;
	}
	

	> .node-output {
		display: flex;
		justify-content: space-evenly;
		align-items: center;

		:deep(.color-display-box) {
			height: 3em;
		} 
	}

	> .node-border {
		--node-border-width: 4px;

		position: absolute;

		inset: calc(-1 * var(--node-border-width));
		padding: var(--node-border-width);
		border-radius: 1em;

		background: var(--node-border-background);

		// Border mask boilerplate from https://stackoverflow.com/a/51496341
		mask: 
				linear-gradient(#fff 0 0) content-box, 
				linear-gradient(#fff 0 0);
		mask-composite: exclude;

		-webkit-mask: 
				linear-gradient(#fff 0 0) content-box, 
				linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;

		pointer-events: none;
	}

	:deep(input) {
		width: 100%;
	}
}
</style>