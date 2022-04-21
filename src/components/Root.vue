<template>
	<main>
		Filler
	</main>
</template>

<script lang="ts">
import {defineComponent} from "vue";

export default defineComponent({
	name: "Root",
});
</script>

<style lang="scss">
* {
	box-sizing: border-box;
}

body {
	margin: 0;
}

input,
button {
	font-family: inherit;
}

main {
	font-family: Atkinson Hyperlegible, Overpass, sans-serif;

	--col-not-text: #0000003f;
	--col-not-bg: #0000000f;
}

main {
	width: 100vw;
	height: 100vh;
	display: grid;
	grid-template-columns: 1fr 1fr;
	align-items: center;
	gap: 2em;
}
</style>