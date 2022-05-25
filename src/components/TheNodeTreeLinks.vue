<script lang="ts" setup>
import {inject} from "vue";

import {Tree, Socket} from "@/models/Node";
import {externals} from "@/models/nodetypes";

const props = defineProps(["socketVues"]);
const socketVue = (socket: Socket) => props.socketVues.get(socket);

const tree = inject("tree") as Tree;
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
		stroke: #f26;
		stroke-dasharray: 4px;
	}
}
</style>