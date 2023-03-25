<script lang="ts" setup>
import {computed} from "vue";

const props = withDefaults(defineProps<{
    x0: number,
    y0: number,
    x1: number,
    y1: number,

    subtle?: boolean,
    invalid?: boolean,
}>(), {
    subtle: false,
    invalid: false,
});


const path = computed(() => {
    const {x0, y0, x1, y1} = props;

	const controlPointDx = Math.max(10, 8 * (Math.abs(x1 - x0 - 12) ** (1/2)));

	return `M${x0},${y0}
C${x0 + controlPointDx},${y0} ${x1 - controlPointDx},${y1}, ${x1},${y1}`;
});
</script>

<template>
	<path :d="path"
			
			:class="{
                subtle,
                invalid,
            }" />
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