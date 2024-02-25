<script lang="ts" setup>
import {computed, nextTick, PropType, ref, watch} from "vue";

import {acceptAlways, identity} from "./base-functions";
import {modifierKeys, tooltipController} from "../store";
import makeDragListener from "../draggable";

import getString, {NO_DESC, StringKey} from "@/strings";
import { clearTextSelection } from "@/util";

const props = defineProps({
  modelValue: {
    type: Number,
    required: true,
  },

  validate: {
    type: Function as PropType<(proposedValue: any) => boolean>,
    default: acceptAlways,
  },

  convertIn: {
    type: Function as PropType<(value: any) => any>,
    default: identity,
  },

  convertOut: {
    type: Function as PropType<(value: any) => any>,
    default: identity,
  },

  hasBounds: {
    type: Boolean,
    default: true,
  },

  min: {
    type: Number,
    default: 0,
  },
  
  max: {
    type: Number,
    default: 1,
  },

  step: {
    type: Number,
    default: 1e-3,
  },

  unboundedChangePerPixel: {
    type: Number,
    default: 0.03125,
  },

  desc: {
    type: String as PropType<StringKey>,
  },
});

const internalMin = computed(() => props.convertIn(props.min));
const internalMax = computed(() => props.convertIn(props.max));


const progress = computed(
  () => (props.modelValue - internalMin.value) / (internalMax.value - internalMin.value));
const amountPerPixel = computed(
  () => props.hasBounds
      ? (internalMax.value - internalMin.value) / textbox.value!.offsetWidth
      : props.unboundedChangePerPixel);


const proposedValueIsValid = ref(true);
const entryActive = ref(false);


const tempValue = ref(props.convertOut(props.modelValue).toString());

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


const onInput = () => {
  entryActive.value = true;
  const proposedValue = props.convertIn(Number(tempValue.value));

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

const beginSliderInput = makeDragListener({
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
  
    const newValue = origValue + displacement.x * amountPerPixel.value * modifierFac;
    
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
input {
  background: linear-gradient(90deg,
      var(--col-slider-progress) var(--slider-progress-pct),
      var(--col-slider-empty) var(--slider-progress-pct));
  border: none;
  color: inherit;

  margin-bottom: 0.25rem;
  border-radius: 4px;

  --slider-progress: 0;
  --slider-progress-pct: calc(var(--slider-progress) * 100%);

  --col-slider-progress: #ad4c64;
  --col-slider-empty: #555857;
  --col-slider-overflow: #f581a6;
  --col-slider-underflow: #212222;

  text-align: right;
  cursor: ew-resize;

  &:hover {
    --col-slider-progress: #dd4f96;
    --col-slider-empty: #666b69;
    --col-slider-overflow: #ffc7cc;
    --col-slider-underflow: #323333;
  }
  
  &.inputing {
    cursor: text;

    --col-slider-progress: #693333;
    --col-slider-empty: #3a3b3b;
    --col-slider-overflow: #ad4c64;
    --col-slider-underflow: #1f1f1f;
  }

  &.overflow {
    background: linear-gradient(90deg,
        var(--col-slider-progress) 50%,
        var(--col-slider-overflow));
  }

  &.underflow {
    background: linear-gradient(90deg,
        var(--col-slider-underflow),
        var(--col-slider-empty) 50%);
  }

  &.unbounded {
  background: linear-gradient(90deg,
      var(--col-slider-empty),
      var(--col-slider-progress));
  }

  &.invalid {
    color: var(--col-invalid-input);
  }
}
</style>