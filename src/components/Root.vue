<template>
	<main>
		<TheNodeTree />
	</main>
</template>

<script lang="ts">
import {defineComponent} from "vue";

import TheNodeTree from "./TheNodeTree.vue";

import {Tree, Node, Socket, Link} from "../models/Node";
import {colorModelNodes} from "../models/nodetypes";

export default defineComponent({
	name: "Root",

	components: {
		TheNodeTree,
	},
});
</script>

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
}
</style>