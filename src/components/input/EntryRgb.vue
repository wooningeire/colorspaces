<script lang="ts" setup>
import {defineComponent, reactive, PropType, ref, watch} from "vue";

import EntrySlider from "./EntrySlider.vue";

import {acceptAlways, cloneArray} from "./base-functions";

import {Vec3} from "$/util";
import getString, {NO_DESC, StringKey} from "$/strings";
import { SliderProps } from "$/node/";


const props = withDefaults(defineProps<{
  modelValue: Vec3,
  validate?: (proposedValue: Vec3) => boolean,
  convertIn?: (proposedValue: Vec3) => Vec3,
  convertOut?: (proposedValue: Vec3) => Vec3,
  maxes?: number[],
  softMaxes?: number[],
  sliderProps?: SliderProps[],
  descs?: StringKey[],
}>(), {
  validate: acceptAlways,
  convertIn: cloneArray,
  convertOut: cloneArray,
  maxes: [],
  softMaxes: [],
  sliderProps: [],
  descs: [],
});


const displayValue = ref(props.convertOut(props.modelValue));


const proposedValueIsValid = ref(true);
const entryActive = ref(false);


const emit = defineEmits([
  "update:modelValue",
]);


const setDisplayToTrueValue = () => {
  displayValue.value = props.convertOut(props.modelValue);
};


const onInput = () => {
  entryActive.value = true;
  emitValueIfValid();
};

const emitValueIfValid = () => {
  const proposedValue = props.convertIn(displayValue.value);

  proposedValueIsValid.value = props.validate(proposedValue);
  if (proposedValueIsValid.value) {
    emit("update:modelValue", proposedValue);
  }
};

const onChange = () => {
  entryActive.value = false;
  setDisplayToTrueValue();
  proposedValueIsValid.value = true;
};

const onBlur = () => {
  entryActive.value = false;
};


watch(() => [props.modelValue, props.convertOut], () => {
  if (entryActive.value) return;
  setDisplayToTrueValue();
});
</script>

<template>
  <div @change.stop="onChange"
      @blur.capture="onBlur"
      :class="{invalid: !proposedValueIsValid}">
    <EntrySlider v-for="(_, i) of modelValue"
        v-model="displayValue[i]"
        @update:modelValue="emitValueIfValid"
        :max="maxes[i]"
        v-bind="sliderProps[i]"

        :desc="descs[i]" />
  </div>
</template>

<style scoped>
.invalid :deep(input) {
  color: var(--col-invalid-input);
}
</style>$/util$/strings$/node/