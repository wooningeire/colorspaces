<script lang="ts" setup>
import {computed, nextTick, onBeforeMount, onMounted, PropType, ref, watch} from "vue";

import {acceptAlways, identity} from "./base-functions";
import {modifierKeys, tooltipController} from "../store";
import createDragListener from "../draggable";

import getString, {NO_DESC, StringKey} from "@/strings";
import { clearTextSelection } from "@/util";

const props = withDefaults(defineProps<{
  modelValue: number,
  validate?: (proposedValue: number) => boolean,
  convertIn?: (value: number) => number,
  convertOut?: (value: number) => number,
  hasBounds?: boolean,
  min?: number,
  max?: number,
  softMin?: number,
  softMax?: number,
  step?: number,
  unboundedChangePerPixel?: number,
  desc?: StringKey,
}>(), {
  validate: acceptAlways,
  convertIn: identity,
  convertOut: identity,
  hasBounds: true,
  min: -Infinity,
  max: Infinity,
  softMin: 0,
  softMax: 1,
  step: 1e-3,
  unboundedChangePerPixel: 0.03125,
  desc: NO_DESC,
});

const internalMin = computed(() => props.convertIn(props.softMin));
const internalMax = computed(() => props.convertIn(props.softMax));


const progress = computed(
  () => (props.modelValue - internalMin.value) / (internalMax.value - internalMin.value));
const amountPerPixel = computed(
  () => props.hasBounds
      ? (internalMax.value - internalMin.value) / textbox.value!.offsetWidth
      : props.unboundedChangePerPixel);


const proposedValueIsValid = ref(true);
const entryActive = ref(false);


const tempValue = ref("");

const displayValue = computed({
  get: () => entryActive.value ? tempValue.value : Number(Number(tempValue.value).toFixed(4)).toString(),
  set: value => tempValue.value = value,
});


const textbox = ref(null as HTMLInputElement | null);

const deselectInput = () => {
  setTimeout(() => {
    textbox.value!.selectionStart = null;
    textbox.value!.selectionEnd = null;
  }, 0);
};


const emit = defineEmits([
  "update:modelValue",
]);


const setDisplayToTrueValue = () => {
  tempValue.value = props.convertOut(props.modelValue).toString();
};
setDisplayToTrueValue();


const onInput = () => {
  entryActive.value = true;
  const proposedValue = props.convertIn(Number(tempValue.value));

  proposedValueIsValid.value = props.validate(proposedValue)
    && proposedValue >= props.convertIn(props.min)
    && proposedValue <= props.convertIn(props.max);
  if (proposedValueIsValid.value) {
    emit("update:modelValue", proposedValue);
  }
};

const onChange = () => {
  entryActive.value = false;
  setDisplayToTrueValue();
  proposedValueIsValid.value = true;
};

const onBlur = (event: FocusEvent) => {
  entryActive.value = false;
};

const onPointerDown = (event: PointerEvent) => {
  if (!entryActive) return;
  beginSliderInput(event);
  deselectInput();
};


const onDrag = () => {
  setDisplayToTrueValue();
};


const roundToStep = (value: number, step: number) => Math.round(value / step) * step;

const stickToBoundTolerance = 12;

const beginSliderInput = createDragListener({
  shouldCancel(event: PointerEvent) {
    return event.button !== 0;
  },

  onPassTolerance(downEvent) {
    (downEvent.target! as HTMLInputElement).requestPointerLock();
  },
  
  onDown() {
    return props.modelValue;
  },

  onDrag(moveEvent, displacement, origValue: number) {
    deselectInput();

    const modifierFac =
        modifierKeys.shift ? 1/8 :
        modifierKeys.ctrl ? 8 :
        1;
  
    const newValue = Math.max(props.min, Math.min(props.max, origValue + displacement.x * amountPerPixel.value * modifierFac));
    
    if (props.hasBounds && Math.abs(newValue - internalMin.value) / stickToBoundTolerance <= amountPerPixel.value * modifierFac) {
      emit("update:modelValue", internalMin.value);
      onDrag();
      return;
    } else if (props.hasBounds && Math.abs(newValue - internalMax.value) / stickToBoundTolerance <= amountPerPixel.value * modifierFac) {
      emit("update:modelValue", internalMax.value);
      onDrag();
      return;
    }
    emit("update:modelValue", roundToStep(newValue, props.step));
    onDrag();
  },

  onUpAfterPassTolerance() {
    document.exitPointerLock();

    setTimeout(() => {
      entryActive.value = false;
      clearTextSelection();
    }, 0);
  },
});

const beginTextInput = (event: PointerEvent) => {
  entryActive.value = true;

  nextTick(() => {
    textbox.value!.select();
  });
};

watch(() => [props.modelValue, props.convertOut], () => {
  if (entryActive.value) return;
  setDisplayToTrueValue();
});


const showTooltip = () => {
  const rect = textbox.value!.getBoundingClientRect();
  tooltipController.showTooltip(getString(props.desc ?? NO_DESC), {
    left: `calc(${rect.right}px + 1.5em)`,
    top: `${rect.top}px`,
  });
};
</script>

<template>
  <input type="text"
      ref="textbox"
      v-model="displayValue"
      @input="onInput"
      @change="onChange"
      @pointerdown="onPointerDown"
      @click="event => !entryActive && beginTextInput(event as any as PointerEvent)"
      @blur="onBlur"
      :class="{
        'invalid': !proposedValueIsValid,
        'inputing': entryActive,
        'overflow': progress > 1,
        'underflow': progress < 0,
        'unbounded': !hasBounds,
      }"

      :style="{
        '--slider-progress': hasBounds ? progress : 0,
      } as any"
      
      @pointerenter="() => showTooltip()"
      @pointerleave="tooltipController.hideTooltip()" />
</template>

<style lang="scss" scoped>
@import "./index.scss";

input {
  @include entry;
  
  text-align: right; 
  cursor: ew-resize;
}
</style>