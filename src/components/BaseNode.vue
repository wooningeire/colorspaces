<script lang="ts" setup>
import {inject, computed} from "vue";

import BaseSocket from "./BaseSocket.vue";
import BaseField from "./BaseField.vue";

import {Node} from "@/models/Node";
import {spaces, externals} from "@/models/nodetypes";

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
	() => props.node.ins[0].links[0]
			&& Object.values(spaces).includes(props.node.constructor as any),
);
</script>

<template>
	<div class="node"
			@pointerdown="event => {
				emitNodeSelected(event);
				startDragging(event);
			}"
			:style="{
				'left': `${node.pos[0] ?? 0}px`, 'top': `${node.pos[1] ?? 0}px`,
			}"
			:class="{
				'subtle': node instanceof externals.DevicePostprocessingNode
						|| node instanceof externals.EnvironmentNode
						|| node instanceof externals.VisionNode,
				'selected': isSelected,
			}">
		<div class="label">
			{{node.label}}
		</div>

		<div class="node-content">
			<!-- <div class="fields">
				<BaseField v-for="field of node.fields"
						:key="field.id"
						:field="field" />
			</div> -->
		</div>

		<div class="in-sockets">
			<template v-for="(socket, index) of node.ins"
					:key="socket.id">
				<div class="color-display-box"
						v-if="node instanceof externals.DeviceTransformNode
								&& socket.hasLinks"
						:style="{
							'background': `rgb(${node.output()[index - 1].map(x => x * 255)})`,
						}"></div>

				<BaseSocket :socket="socket"
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
			<BaseSocket v-for="socket of node.outs"
					:key="socket.id"
					:socket="socket"
					@drag-socket="socketVue => $emit('drag-socket', socketVue)"
					@link-to-socket="socketVue => ($emit('link-to-socket', socketVue),
							$emit('tree-update'),
							$emit('potential-socket-position-change'))"

					@unlink="$emit('tree-update'),
							$emit('potential-socket-position-change')" />
		</div>

		<template v-if="shouldDisplayOutput">
			{{node.output().map((x: number) => x.toFixed(4))}}
		</template>
	</div>
</template>

<style lang="scss" scoped>
.node {
	position: absolute;
	// display: inline grid;
	display: flex;
	flex-direction: column;
	border: 4px solid var(--node-border-color);
	width: 160px;
	padding-bottom: 1em;

	border-radius: 1em;
	background: #2e3331df;
	box-shadow: 0 4px 40px -20px #000000af;

	font-size: calc(14/16 * 1em);

	cursor: default;

	--node-border-color: #ffffff3f;

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

	&.selected {
		border-color: #80efff;
	}

	> .label {
		text-align: center;
		padding: 0 0.25em;
		font-weight: 800;

		// pointer-events: none;
	}

	> .node-content {
		margin-bottom: 0.5em;

		> .fields {
			display: flex;
			flex-flow: column;
		}
	}

	.color-display-box {
		position: absolute;
		right: .5em;
		width: 3em;
		height: 1em;

		box-shadow: 0 0 0 2px var(--node-border-color);
	}

	:deep(input) {
		width: 100%;
	}
}
</style>