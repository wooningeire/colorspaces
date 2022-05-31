<script lang="ts" setup>
import {inject, computed} from "vue";

import NodeSocket from "./NodeSocket.vue";
import NodeField from "./NodeField.vue";
import NodeSpecialInput from "./NodeSpecialInput.vue";
import NodeOutput from "./NodeOutput.vue";
import NodeOutputColorDisplay from "./NodeOutputColorDisplay.vue";

import {Node} from "@/models/Node";
import {models, spaces, math, images, externals, organization} from "@/models/nodetypes";

import {Listen, clearTextSelection, Vec2} from "@/util";

import {selectedNodes, modifierKeys} from "./store";
import makeDragListener from "./draggable";


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


const beginDrag = makeDragListener({
	shouldCancel(event: PointerEvent) {
		// Make this check more sophisticated
		// return event.target !== this.$el;
		return ["input", "select"].includes((event.target as Element).tagName.toLowerCase())
				|| !props.node.canMove;
	},

	onDrag(moveEvent) {
		props.node.pos[0] += moveEvent.movementX;
		props.node.pos[1] += moveEvent.movementY;

		emit("node-dragged");
		emit("potential-socket-position-change");
	},
});


const emitNodeSelected = (event: PointerEvent) => {
	if (modifierKeys.shift) {
		clearTextSelection();
		// event.preventDefault();
	}

	emit("node-selected", props.node, !modifierKeys.shift);
};


const shouldDisplayLabel = computed(() => !(props.node instanceof organization.RerouteNode))


const nodeCategories = new Map([models, spaces, math, images, externals, organization]
		.map(category =>
				Object.values(category)
						.map(nodeType => [nodeType.TYPE, category]))
		.flat() as [symbol, unknown][]);


const category = computed(() => nodeCategories.get(props.node.type));

const categoryNames = new Map<unknown, string>([
	[models, "models"],
	[spaces, "spaces"],
	[math, "math"],
	[images, "images"],
	[externals, "externals"],
]);
const nodeCategoryClass = computed(() =>
		categoryNames.has(category.value)
				? `category--${categoryNames.get(category.value)}`
				: ""
);


const isSubtle = computed(() => 
		props.node instanceof externals.DevicePostprocessingNode
		|| props.node instanceof externals.EnvironmentNode
		|| props.node instanceof externals.VisionNode
);

</script>

<template>
	<div class="node"
			@pointerdown="event => {
				emitNodeSelected(event);
				beginDrag(event);
			}"
			:style="{
				'left': `${node.pos[0]}px`,
				'top': `${node.pos[1]}px`,
				'--node-width': `${node.width}px`,
			} as any"
			:class="[{
				'subtle': isSubtle,
				'selected': isSelected,
			}, nodeCategoryClass]">
		<div class="node-border"></div>

		<div class="label"
				v-if="shouldDisplayLabel">
			{{node.label}}
		</div>

		<NodeSpecialInput :node="node" />

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
				<NodeOutputColorDisplay v-if="node instanceof externals.DeviceTransformNode
								&& socket.hasLinks"
						:node="node"
						:socket="socket" />

				<NodeSocket :socket="socket"
						@drag-socket="socketVue => $emit('drag-socket', socketVue)"
						@link-to-socket="socketVue => (
							$emit('link-to-socket', socketVue),
							$emit('tree-update'),
							$emit('potential-socket-position-change'))"

						@value-change="$emit('tree-update')"
						@unlink="
							$emit('tree-update'),
							$emit('potential-socket-position-change')" />
			</template>
		</div>

		<div class="out-sockets">
			<NodeSocket v-for="socket of node.outs"
					:key="socket.id"
					:socket="socket"
					@drag-socket="socketVue => $emit('drag-socket', socketVue)"
					@link-to-socket="socketVue => (
						$emit('link-to-socket', socketVue),
						$emit('tree-update'),
						$emit('potential-socket-position-change'))"

					@unlink="
						$emit('tree-update'),
						$emit('potential-socket-position-change')" />
		</div>

		<!-- {{node.output().map((x: number) => x.toFixed(4))}} -->
		<NodeOutput :node="node" />
	</div>
</template>

<style lang="scss" scoped>
@import "./mixins.scss";

.node {
	position: absolute;
	// display: inline grid;
	display: flex;
	flex-direction: column;
	width: var(--node-width);
	padding: 0.5em 0;

	background: var(--node-background);

	box-shadow: 0 4px 40px -20px #000000af;
	border-radius: calc(1em - var(--node-border-width));

	font-size: calc(14/16 * 1em);

	cursor: default;

	--node-border-width: 4px;
	--node-border-background: #ffffff3f; //linear-gradient(#9c20aa, #fb3570);
	--node-background: #2e3331df;

	--node-width: 40px;

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

		width: 100%;

		:deep(.color-display-box) {
			height: 3em;
		} 
	}

	> .node-border {
		@include gradient-border(var(--node-border-width), var(--node-border-background));
	}

	:deep(input[type="text"]) {
		width: 100%;
	}

	&.category--models {
		--node-border-background: linear-gradient(hsl(-20deg 40% 60%), hsl(30deg 40% 50%));
		--node-background: hsl(-20deg 20% 20% / 0.8745);
	}
	&.category--spaces {
		--node-border-background: linear-gradient(hsl(260deg 40% 60%), hsl(300deg 40% 60%));
		--node-background: hsl(260deg 20% 20% / 0.8745);
	}
	&.category--math {
		--node-border-background: linear-gradient(hsl(50deg 40% 60%), hsl(90deg 40% 60%));
		--node-background: hsl(80deg 15% 18% / 0.8745);
	}
	&.category--images {
		--node-border-background: linear-gradient(hsl(165deg 10% 50%), hsl(185deg 10% 60%));
		--node-background: hsl(165deg 10% 20% / 0.8745);
	}
	&.category--externals {
		--node-border-background: linear-gradient(hsl(220deg 40% 50%), hsl(200deg 40% 50%));
		--node-background: hsl(220deg 25% 20% / 0.8745);
	}
}
</style>