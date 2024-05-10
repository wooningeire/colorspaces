<script lang="ts" setup>
import ReadonlyInput from "./ReadonlyInput.vue";
import getString, { StringKey } from "@/strings";

const props = withDefaults(defineProps<{
  values: string[],
  labels: StringKey[],
  useInputs?: boolean,
}>(), {
  useInputs: false,
});
</script>

<template>
  <div class="output-values two-column">
    <template v-for="(value, index) of values">
      <div
        class="header"
        v-html="index < labels.length ? getString(labels[index]) : ''"
      >
      </div>
      <div
        class="data"
        v-if="!useInputs"
      >
        {{values[index]}}
      </div>

      <ReadonlyInput
        :value="values[index]"
        v-else
      />
    </template>
  </div>
</template>

<style lang="scss" scoped>
.output-values {
  &.two-column {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0 1em;
    text-align: right;
  }
  
  > .header {
    font-weight: 700;
  }
}
</style>