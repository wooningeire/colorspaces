<template>
	<div class="socket-container"
			:class="{'in': socket.isInput}">
		<div class="socket"
				v-if="socket.showSocket"

				ref="socketHitbox"
				draggable="true"
				@dragstart="ondragstart"
				@dragenter.prevent
				@dragover.prevent
				@drop="ondrop"

				@dblclick="unlinkLinks">
			<div class="socket-display"></div>
		</div>
		{{socket.label}}

		<div class="socket-value-editor" v-if="socket.isInput && !socket.links[0]">
			<template v-if="socket.type === SocketType.Float">
				<BaseEntry v-model="socket.fieldValue"
						@update:modelValue="$emit('value-change')"
						
						:validate="isFinite" />
			</template>

			<template v-else-if="socket.type === SocketType.RgbRaw">
				<EntryRgb v-model="socket.fieldValue"
						@update:modelValue="$emit('value-change')"

						:validate="color => color.every(comp => isFinite(comp))" />
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import {defineComponent, inject} from "vue";

import BaseEntry from "./input/BaseEntry.vue";
import EntryRgb from "./input/EntryRgb.vue";

import {Tree, Socket} from "@/models/Node";

export default defineComponent({
    name: "BaseSocket",
    props: {
        socket: {
            type: Socket,
            required: true,
        },
    },

	emits: ["value-change", "drag-socket", "link-to-socket", "unlink"],

	// For TypeScript
	setup() {
		return {
			tree: inject("tree") as Tree,
			draggedSocket: inject("draggedSocket") as Socket,
			socketVues: inject("socketVues") as WeakMap<Socket, unknown>,
		};
	},

	// inject: ["tree", "draggedSocket"],

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

            return this.socket.isInput !== this.draggedSocket.isInput
                && this.socket.node !== this.draggedSocket.node
                && this.socket.type === this.draggedSocket.type;
        },

		unlinkLinks() {
			this.socket.links.forEach(link => this.tree.unlink(link));
			this.$emit("unlink");
		},

		rect() {
			return this.socketEl.getBoundingClientRect();
		},

		socketPos() {
			return [
				(this.rect().left + this.rect().right) / 2,
				(this.rect().top + this.rect().bottom) / 2,
			];
		},
    },
    computed: {
        socketEl() {
            return this.$refs.socketHitbox as HTMLDivElement;
        },

        SocketType() {
            return Socket.Type;
        },
    },

	mounted() {
		this.socketVues.set(this.socket, this);
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