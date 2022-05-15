<script lang="ts" setup>
import {ref, reactive, onMounted} from "vue";

import TheNodeTree from "./TheNodeTree.vue";
import TheNodeTray from "./TheNodeTray.vue";

import {Tree} from "@/models/Node";

const tree = reactive(new Tree());
</script>

<template>
	<TheNodeTree :tree="tree" />
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