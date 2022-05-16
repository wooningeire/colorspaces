<script lang="ts" setup>
import {ref, reactive, onMounted} from "vue";

import TheNodeTree, {DeviceNodes} from "./TheNodeTree.vue";
import TheNodeTray from "./TheNodeTray.vue";

import {Tree} from "@/models/Node";
import {rgbModels, spaces, externals} from "@/models/nodetypes";

const dn = reactive(<DeviceNodes>{});
const tree = reactive(new Tree());

tree.nodes.push(
	new spaces.SrgbNode([450, 50]),
	(dn.transformNode = new externals.DeviceTransformNode([800, 100])),
	(dn.postprocessingNode = new externals.DevicePostprocessingNode([800, 250])),
	(dn.environmentNode = new externals.EnvironmentNode([800, 400])),
	(dn.visionNode = new externals.VisionNode([800, 550])),
);

tree.linkSockets(dn.transformNode.outs[0], dn.postprocessingNode.ins[0]);
tree.linkSockets(dn.postprocessingNode.outs[0], dn.environmentNode.ins[0]);
tree.linkSockets(dn.environmentNode.outs[0], dn.visionNode.ins[0]);
</script>

<template>
	<TheNodeTree :tree="tree"
			:deviceNodes="dn" />
	<TheNodeTray @add-node="nodeConstructor => tree.nodes.push(new nodeConstructor())" />
</template>

<style lang="scss">
* {
	box-sizing: border-box;
}

body {
	margin: 0;
	font-family: Atkinson Hyperlegible, Overpass, sans-serif;
}

input,
button {
	font-family: inherit;
}

main {
	width: 100vw;
	height: 100vh;
	display: grid;
	align-items: center;
	grid-template-rows: 1fr max(20vh, 15em);

	background: radial-gradient(circle, #4a514e, #2f3432 80%, #1f2321);
	color: #fff;

	> .node-tree {
		grid-area: 1/1 / 3/2;
	}

	> .node-tray {
		grid-area: 2/1;
		z-index: 1;
	}
}
</style>