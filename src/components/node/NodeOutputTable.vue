<script lang="ts" setup>
import {PropType, computed} from 'vue';

import {settings} from "../store";

import {Col} from "@/models/colormanagement";
import {SocketFlag} from '@/models/Node';

const props = withDefaults(defineProps<{
  values: string[],
  labels: string[],
  useInputs?: boolean,
}>(), {
  useInputs: false,
});

</script>

<template>
  <div class="output-values two-column">
    <template v-for="(value, index) of values">
      <div class="header">
        {{index < labels.length ? labels[index] : ''}}
      </div>
      <div class="data"
          v-if="!useInputs">
                {{values[index]}}
      </div>

      <input class="data"
          :value="values[index]"
          readonly
          @pointerdown="(event) => (event.currentTarget as HTMLInputElement).select()"
          @pointerup="(event) => (event.currentTarget as HTMLInputElement).select()"
          v-else />
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

  > input {
    margin: 0.25em;
    width: 30ch;
    border: none;

    font-size: 1em;
    text-align: inherit;
    background: #424545;
    border-radius: 0.25em;
    color: inherit;
  }
}
</style>