<script lang="ts" setup>
import {ref, reactive, onMounted, provide, Ref} from "vue";

import TheNodeTree, {DeviceNodes} from "./TheNodeTree.vue";
import TheNodeTray from "./TheNodeTray.vue";
import TheToolbar from "./TheToolbar.vue";

import {Tree, Node} from "@/models/Node";
import {rgbModels, spaces, externals} from "@/models/nodetypes";

const dn = reactive(<DeviceNodes>{});
const tree = reactive(new Tree());

[
	new spaces.SrgbNode([450, 50]),
	(dn.transformNode = new externals.DeviceTransformNode([800, 100])),
	(dn.postprocessingNode = new externals.DevicePostprocessingNode([800, 250])),
	(dn.environmentNode = new externals.EnvironmentNode([800, 400])),
	(dn.visionNode = new externals.VisionNode([800, 550]))
].forEach(tree.nodes.add, tree.nodes);

tree.linkSockets(dn.transformNode.outs[0], dn.postprocessingNode.ins[0]);
tree.linkSockets(dn.postprocessingNode.outs[0], dn.environmentNode.ins[0]);
tree.linkSockets(dn.environmentNode.outs[0], dn.visionNode.ins[0]);


const selectedNodes = reactive(new Set<Node>());
provide("selectedNodes", selectedNodes);


const treeVue = ref(null) as any as Ref<InstanceType<typeof TheNodeTree>>;


const modifierKeys = reactive({
	ctrl: false,
	shift: false,
	alt: false,
	meta: false,
});
provide("modifierKeys", modifierKeys);

const updateModifierKeys = (event: KeyboardEvent) => {
	Object.assign(modifierKeys, {
		ctrl: event.ctrlKey,
		shift: event.shiftKey,
		alt: event.altKey,
		meta: event.metaKey,
	});
};

addEventListener("keydown", updateModifierKeys);
addEventListener("keyup", updateModifierKeys);


const addNode = <T extends Node>(nodeConstructor: new () => T) => {
	const node = new nodeConstructor();
	tree.nodes.add(node);
	treeVue.value.selectNode(node);
};
</script>

<template>
	<TheNodeTree :tree="tree"
			:deviceNodes="dn"
			ref="treeVue" />
	<TheNodeTray @add-node="addNode" />

	<TheToolbar @delete-node="() => {
		selectedNodes.forEach(tree.deleteNode, tree);
		treeVue.recomputeOutputColor();
	}" />
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
	grid-template-columns: 8em 1fr;

	background: radial-gradient(circle, #4a514e, #2f3432 80%, #1f2321);
	color: #fff;

	> .node-tree {
		grid-area: 1/1 / 3/3;
	}

	> .toolbar {
		grid-area: 2/1;
	}

	> .node-tray {
		grid-area: 2/2;
		z-index: 1;
	}
}
</style>