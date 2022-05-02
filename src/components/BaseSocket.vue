<template>
	<div class="socket-container"
			:class="{'in': socket.isInput}">
		<div class="socket"
				draggable="true"
				@dragstart="ondragstart"
				@dragenter.prevent
				@dragover.prevent
				@drop="ondrop"></div>
		{{socket.label}}
	</div>
</template>

<script lang="ts">
import {defineComponent} from "vue";
import {Socket} from "../models/Node";

export default defineComponent({
	name: "BaseSocket",

	props: {
		socket: {
			type: Socket,
			required: true,
		},

		draggedSocket: {
			type: Socket,
		},
	},

	methods: {
		ondragstart(event: DragEvent) {
			event.dataTransfer.dropEffect = "link";
			event.dataTransfer.setDragImage(document.createElement("div"), 0, 0);

			this.$emit("drag-socket", this);
		},

		ondrop(event: DragEvent) {
			if (this.willAcceptLink()) {
				this.$emit("link-to-socket", this);
			}
		},

		willAcceptLink() {
			return (this.socket.isInput !== this.draggedSocket.isInput)
					&& (this.socket.node !== this.draggedSocket.node)
					&& (this.socket.type === this.draggedSocket.type);
		},
	},

	computed: {
		socketEl() {
			return this.$el?.querySelector(".socket");
		},
	},
});
</script>

<style lang="scss" scoped>
.socket-container {
	position: relative;

	--socket-text-padding: 8px;

	> .socket {
		width: var(--socket-size);
		height: var(--socket-size);
		position: absolute;
		top: 0.5em;
		bottom: 0.5em;

		border-radius: 50%;
		background: currentcolor;
		box-shadow: 0 0 0 4px #2f3432;

		--socket-size: 10px;
		--socket-offset: -7px;
	}

	&.in {
		padding-left: var(--socket-text-padding);

		> .socket {
			left: var(--socket-offset);
		}
	}

	&:not(.in) {
		text-align: right;
		padding-right: var(--socket-text-padding);

		> .socket {
			right: var(--socket-offset);
		}
	}
}
</style>