<template>
	<div class="socket-container"
			:class="{'in': socket.isInput}">
		<div class="socket"
				draggable="true"
				v-if="socket.showSocket"
				@dragstart="ondragstart"
				@dragenter.prevent
				@dragover.prevent
				@drop="ondrop">
			<div class="socket-display"></div>
		</div>
		{{socket.label}}

		<div class="socket-value-editor" v-if="socket.isInput && !socket.links[0]">
			<template v-if="socket.type === SocketType.Float">
				<BaseEntry v-model="socket.fieldValue" />
			</template>

			<template v-else-if="socket.type === SocketType.RgbRaw">
				<EntryRgb v-model="socket.fieldValue" />
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import {defineComponent} from "vue";
import {Socket} from "../models/Node";
import BaseEntry from "./input/BaseEntry.vue";
import EntryRgb from "./input/EntryRgb.vue";

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
            event.dataTransfer!.dropEffect = "link";
            event.dataTransfer!.setDragImage(document.createElement("div"), 0, 0);
            this.$emit("drag-socket", this);
        },
        ondrop(event: DragEvent) {
            if (this.willAcceptLink()) {
                this.$emit("link-to-socket", this);
            }
        },
        willAcceptLink() {
			// preemptive + stops TypeScript complaint
			if (!this.draggedSocket) throw new TypeError("Not currently dragging from a socket");

            return (this.socket.isInput !== this.draggedSocket.isInput)
                && (this.socket.node !== this.draggedSocket.node)
                && (this.socket.type === this.draggedSocket.type);
        },
    },
    computed: {
        socketEl() {
            return this.$el?.querySelector(".socket");
        },
        SocketType() {
            return Socket.Type;
        },
    },
    components: {
		BaseEntry,
		EntryRgb,
	},
});
</script>

<style lang="scss" scoped>
.socket-container {
	position: relative;
	margin-bottom: .25em;

	--socket-text-padding: 8px;

	> .socket {
		--socket-box-size: 20px;
		--socket-size: 10px;
		--socket-offset: -12px;

		width: var(--socket-box-size);
		height: var(--socket-box-size);
		position: absolute;
		top: 0em;
		bottom: 0.5em;

		display: grid;
		place-items: center;
		
		> .socket-display {
			width: var(--socket-size);
			height: var(--socket-size);

			border-radius: 50%;
			background: currentcolor;
			box-shadow: 0 0 0 4px #2f3432;
		}
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