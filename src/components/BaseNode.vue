<template>
	<div class="node"
			@pointerdown="event => {
				startDragging(event);
				emitNodeSelected(event);
			}"
			:style="{
				'left': `${node.pos[0] ?? 0}px`, 'top': `${node.pos[1] ?? 0}px`,
				'color': node instanceof externals.DeviceTransformNode ? `rgb(${node.displayColor.map(x => x * 255)})` : '',
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
			<div class="fields">
				<BaseField v-for="field of node.fields"
						:key="field.id"
						:field="field" />
			</div>
		</div>

		<div class="in-sockets">
			<BaseSocket v-for="socket of node.ins"
					:key="socket.label"
					:socket="socket"
					@drag-socket="socketVue => $emit('drag-socket', socketVue)"
					@link-to-socket="socketVue => ($emit('link-to-socket', socketVue),
							$emit('tree-update'),
							$emit('potential-socket-position-change'))"

					@value-change="$emit('tree-update')"
					@unlink="$emit('tree-update'),
							$emit('potential-socket-position-change')" />
		</div>

		<div class="out-sockets">
			<BaseSocket v-for="socket of node.outs"
					:key="socket.label"
					:socket="socket"
					@drag-socket="socketVue => $emit('drag-socket', socketVue)"
					@link-to-socket="socketVue => ($emit('link-to-socket', socketVue),
							$emit('tree-update'),
							$emit('potential-socket-position-change'))"

					@unlink="$emit('tree-update'),
							$emit('potential-socket-position-change')" />
		</div>
	</div>
</template>

<script lang="ts">
import {defineComponent, inject} from "vue";

import BaseSocket from "./BaseSocket.vue";
import BaseField from "./BaseField.vue";

import {Node, Socket} from "@/models/Node";
import {externals} from "@/models/nodetypes";
import {clearTextSelection, Listen, ModifierKeys} from "@/util";

export default defineComponent({
	name: "BaseNode",

	props: {
		node: {
			type: Node,
			required: true,
		},
	},

	setup() {
		return {
			selectedNodes: inject("selectedNodes") as Set<Node>,
			modifierKeys: inject("modifierKeys") as ModifierKeys,
		};
	},

	emits: [
		"drag-socket",
		"link-to-socket",
		"node-dragged",
		"potential-socket-position-change",
		"tree-update",
		"node-selected",
	],

	computed: {
		externals() {
			return externals;
		},

		isSelected() {
			return this.selectedNodes.has(this.node);
		},
	},

	methods: {
		startDragging(event: PointerEvent) {
			if (this.shouldCancelDrag(event)) return;
			
			const startingPos = this.node.pos;
			const pointerStartPos = [event.pageX, event.pageY];

			const moveListener = Listen.for(window, "pointermove", (moveEvent: PointerEvent) => {
				clearTextSelection();

				this.node.pos = [
					startingPos[0] + (moveEvent.pageX - pointerStartPos[0]),
					startingPos[1] + (moveEvent.pageY - pointerStartPos[1]),
				];

				this.$emit("node-dragged");
				this.$emit("potential-socket-position-change");
			});

			addEventListener("pointerup", () => {
				moveListener.detach();
			}, {once: true});
		},

		shouldCancelDrag(event: PointerEvent) {
			// Make this check more sophisticated
			// return event.target !== this.$el;
			return (event.target as Element).tagName.toLowerCase() === "input";
		},

		emitNodeSelected(event: PointerEvent) {
			if (this.modifierKeys.shift) {
				clearTextSelection();
				// event.preventDefault();
			}

			this.$emit("node-selected", this.node, !this.modifierKeys.shift);
		},
	},

	components: {
		BaseSocket,
		BaseField,
	},
});
</script>

<style lang="scss" scoped>
.node {
	position: absolute;
	// display: inline grid;
	display: flex;
	flex-direction: column;
	border: 4px solid #ffffff3f;
	width: 160px;
	padding-bottom: 1em;

	border-radius: 1em;
	background: #2e3331df;
	box-shadow: 0 4px 40px -20px #000000af;

	font-size: calc(14/16 * 1em);

	cursor: default;

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

	:deep(input) {
		width: 100%;
	}
}
</style>