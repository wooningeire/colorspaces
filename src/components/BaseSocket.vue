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

		draggingSocket: {
			type: Boolean,
			required: true,
		},
	},

	methods: {
		ondragstart(event: DragEvent) {
			event.dataTransfer.dropEffect = "link";
			event.dataTransfer.setDragImage(document.createElement("div"), 0, 0);

			this.$emit("drag-socket", this);
		},

		ondrop(event: DragEvent) {
			this.$emit("link-to-socket", this);
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

	> .socket {
		width: 8px;
		height: 8px;
		position: absolute;
		top: 0.5em;
		bottom: 0.5em;

		background: currentcolor;
	}

	&.in > .socket {
		left: -8px;
	}

	&:not(.in) {
		text-align: right;

		> .socket {
			right: -8px;
		}
	}
}
</style>