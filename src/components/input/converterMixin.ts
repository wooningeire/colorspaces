const identity = value => value;

export default {
  props: {
    convertIn: {
      type: Function,
      default: identity,
    },

    convertOut: {
      type: Function,
      default: identity,
    },

    modelValue: {
      type: Number,
      default: 0,
    },
  },

  methods: {
    /**
     * Override!
     */
    updateDisplayValue() {
      this.$el.value = this.convertIn(this.modelValue);
    },
  },

  mounted() {
    this.updateDisplayValue();
  },
};