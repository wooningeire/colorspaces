<script lang="ts" setup>
import {computed, PropType} from "vue";

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

const isVisible = computed(() => Boolean(props.text));
</script>

<template>
  <div class="tooltip"
      v-if="isVisible"
      :style="pos"
      v-html="text">
  </div>
</template>

<style lang="scss" scoped>
.tooltip {
  position: absolute;
  padding: 0.5em;
  border-radius: 0.5em;

  font-size: calc(14/16 * 1em);
  max-width: 80ch;

  background: #000000cf;
}
</style>