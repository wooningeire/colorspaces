<script lang="ts" setup>
import {ref, reactive, onMounted, provide, Ref} from "vue";

import TheNodeTree from "./TheNodeTree.vue";
import TheNodeTray from "./TheNodeTray.vue";
import TheToolbar from "./TheToolbar.vue";

import {Node} from "@/models/Node";

import {Vec2} from "@/util";

import {tree} from "./store";


const treeVue = ref(null as InstanceType<typeof TheNodeTree> | null);


const viewportPos = reactive([0, 0]);
const screenToViewport = (screenPos: number[]) => screenPos.map((coord, i) => coord - viewportPos[i]);
provide("treeViewportPos", viewportPos);
provide("screenToViewport", screenToViewport);


const addNode = <T extends Node>(nodeConstructor: new () => T, screenPos: Vec2=[0, 0]) => {
	const node = new nodeConstructor().setPos(screenToViewport(screenPos) as Vec2);
	tree.nodes.add(node);
	treeVue.value!.selectNode(node);
};
</script>

<template>
	<TheNodeTree ref="treeVue"
			@add-node="addNode" />
	<TheNodeTray @add-node="addNode" />

	<TheToolbar />
</template>

<style lang="scss">
* {
	box-sizing: border-box;
}

:root {
	--node-border-color: #ffffff3f;
	--col-invalid-input: #f57;

	--font-mono: Ubunto Mono, monospace;
}

body {
	margin: 0;
	font-family: Atkinson Hyperlegible, Overpass, sans-serif;
	font-weight: 300;
}

input,
button,
select {
	font-family: inherit;
}

main {
	width: 100vw;
	height: 100vh;
	display: grid;
	align-items: center;
	grid-template-rows: 1fr max(20vh, 15em);
	grid-template-columns: 8em 1fr;

	--grid-size: 16px;

	background:
			linear-gradient(0deg, #0000000f 2px, #0000 2px),
			linear-gradient(90deg, #0000000f 2px, #0000 2px),
			radial-gradient(circle, #4a514e, #2f3432 80%, #1f2321);
	background-size:
			var(--grid-size) var(--grid-size),
			var(--grid-size) var(--grid-size),
			100%;

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

button {
	background: #000000cf;
	border: none;
	color: #ffffff7f;

	border-radius: 0.5em;

	&:is(:hover, :focus) {
		background: #ffffff3f;
		color: #fff;
	}
}
</style>