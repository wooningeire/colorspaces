<script lang="ts" setup>
import {inject, Ref} from "vue";

import NodeLink from "./NodeLink.vue";

import {Tree, Socket, Link} from "@/models/Node";
import {externals} from "@/models/nodetypes";

import {tree} from "./store";

const props = defineProps(["socketVues"]);
const socketVue = (socket: Socket) => props.socketVues.get(socket);

// This component is force-updated by TheNodeTree when a socket moves

const srcX = (link: Link) => socketVue(link.src)?.socketPos()[0];
const srcY = (link: Link) => socketVue(link.src)?.socketPos()[1];
const dstX = (link: Link) => socketVue(link.dst)?.socketPos()[0];
const dstY = (link: Link) => socketVue(link.dst)?.socketPos()[1];

const linkPath = (link: Link) => {
	const x0 = srcX(link);
	const y0 = srcY(link);
	const x1 = dstX(link);
	const y1 = dstY(link);

	const controlPointDx = Math.max(10, 8 * (Math.abs(x1 - x0 - 12) ** (1/2)));

	return `M${x0},${y0}
C${x0 + controlPointDx},${y0} ${x1 - controlPointDx},${y1}, ${x1},${y1}`;
};
</script>

<template>
	<NodeLink v-for="link of tree.links"
			:key="link.id"

			:x0="srcX(link)"
			:y0="srcY(link)"
			:x1="dstX(link)"
			:y1="dstY(link)"

			:subtle="link.dstNode instanceof externals.DevicePostprocessingNode
					|| link.dstNode instanceof externals.EnvironmentNode
					|| link.dstNode instanceof externals.VisionNode"

			:invalid="link.causesCircularDependency" />
</template>

<style lang="scss" scoped>
path {
	fill: none;

	&.subtle {
		opacity: 0.25;
	}

	&.invalid {
		stroke: #f68;
		stroke-dasharray: 4px;
		animation: move-stroke 0.25s infinite linear;

		@keyframes move-stroke {
			0% {
				stroke-dashoffset: 0;
			}
			100% {
				stroke-dashoffset: -8px;
			}
		}
	}
}
</style>
<!-- 

const srcPos = (link: Link) => socketVue(link.src)?.socketPos();
const dstPos = (link: Link) => socketVue(link.dst)?.socketPos();

<template>
	<g v-for="link of tree.links"
			:key="link.id"
			:class="{
				'subtle': link.dstNode instanceof externals.DevicePostprocessingNode
						|| link.dstNode instanceof externals.EnvironmentNode
						|| link.dstNode instanceof externals.VisionNode,
				'invalid': link.causesCircularDependency,
			}">
		<line class="solid-link"
				v-if="!link.causesCircularDependency"
				:x1="srcPos(link)[0]"
				:y1="srcPos(link)[1]"
				:x2="dstPos(link)[0]"
				:y2="dstPos(link)[1]" />
		<line class="dashed-link"
				:x1="srcPos(link)[0]"
				:y1="srcPos(link)[1]"
				:x2="dstPos(link)[0]"
				:y2="dstPos(link)[1]"  />
	</g>
</template>

<style lang="scss" scoped>
.subtle {
	opacity: 0.25;
}

.invalid {
	stroke: #f68;
}

g > .dashed-link {
	stroke-dasharray: 4px;
	animation: move-stroke 0.25s infinite linear;

	stroke-width: 3px;

	@keyframes move-stroke {
		0% {
			stroke-dashoffset: 0;
		}
		100% {
			stroke-dashoffset: calc(-4/3 * 1%);
		}
	}
}
</style>
-->