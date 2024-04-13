<script lang="ts" setup>
const props = withDefaults(defineProps<{
  value: any,
  cssWidth?: string,
}>(), {
  cssWidth: "30ch",
});
</script>

<template>
    <input
      class="data"
      :value="value"
      readonly
      @pointerdown="(event) => (event.currentTarget as HTMLInputElement).select()"
      @pointerup="(event) => (event.currentTarget as HTMLInputElement).select()"
      :style="{
        '--width': cssWidth,
      }"
    />
</template>

<style lang="scss" scoped>
input {
  --width: 30ch;

  margin: 0.25em;
  width: var(--width);
  border: none;

  font-family: var(--font-mono);
  font-size: 1em;
  text-align: inherit;
  background: #424545;
  border-radius: 0.25em;
  color: inherit;
}
</style>