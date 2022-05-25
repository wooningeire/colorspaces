<script lang="ts" setup>
import {inject} from "vue";

import {Tree, Socket} from "@/models/Node";
import {externals} from "@/models/nodetypes";

import {tree} from "./store";

const props = defineProps(["socketVues"]);
const socketVue = (socket: Socket) => props.socketVues.get(socket);
</script>

<template>
	<line v-for="link of tree.links"
			:key="link.id"
			:x1="socketVue(link.src)?.socketPos()[0]"
			:y1="socketVue(link.src)?.socketPos()[1]"
			:x2="socketVue(link.dst)?.socketPos()[0]"
			:y2="socketVue(link.dst)?.socketPos()[1]"
			
			:class="{
				'subtle': link.dstNode instanceof externals.DevicePostprocessingNode
						|| link.dstNode instanceof externals.EnvironmentNode
						|| link.dstNode instanceof externals.VisionNode,
				'invalid': link.causesCircularDependency,
			}" />
</template>

<style lang="scss" scoped>
line {
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
				stroke-dashoffset: -200%;
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