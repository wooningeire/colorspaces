<template>
  <input type="range"
      step="any"
      :min="minValue"
      :max="maxValue"
      @input="handleInput"
      @change="updateDisplayValue">
</template>

<script>
import {defineComponent} from "vue";
import converterMixin from "./converterMixin";

export default defineComponent({
  name: "slider",

  mixins: [converterMixin],

  props: {
    minValue: {
      type: Number,
      default: 0,
    },

    maxValue: {
      type: Number,
      default: 1,
    },
  },

  methods: {
    handleInput() {
      this.$emit("input", this.convertOut(Number(this.$el.value)));
    },
  },
  
  watch: {
    value() {
      this.updateDisplayValue();
    },
  },
});
</script>