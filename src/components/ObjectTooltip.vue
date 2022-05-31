<script lang="ts" setup>
import { PropType } from 'vue';

const props = defineProps({
	text: {
		type: String,
		default: "",
	},

	pos: {
		type: Object,
		required: true,
	},
});
</script>

<template>
	<div class="tooltip"
			:style="pos">
		{{text}}
	</div>
</template>

<style lang="scss" scoped>
.tooltip {
	position: absolute;
	padding: 0.5em;
	border-radius: 0.5em;

	background: #000000cf;
}
</style>