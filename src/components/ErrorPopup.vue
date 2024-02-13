<script lang="ts" setup>
import {computed, ref, watch} from "vue";
import { errorPopupController } from "./store";

const props = withDefaults(defineProps<{
  text: string,
}>(), {
  text: "",
});

const isVisible = ref(false);

let timeoutHandle = ref<ReturnType<typeof setTimeout>>(-1 as unknown as ReturnType<typeof setTimeout>);

watch(() => props.text, () => {
  clearTimeout(timeoutHandle.value);

  if (props.text === "") {
    isVisible.value = false;
    return;
  }

  isVisible.value = true;

  timeoutHandle.value = setTimeout(() => {
    errorPopupController.hidePopup();
  }, 10000);
});
</script>

<template>
  <div class="error-popup"
      v-if="isVisible"
      v-html="text">
  </div>
</template>

<style lang="scss" scoped>
.error-popup {
  position: absolute;
  top: 4em;
  left: 12em;
  right: 12em;
  padding: 1em;

  z-index: 2;

  font-size: calc(14/16 * 1em);
  text-align: center;

  background: #000000cf;
  border: 4px solid #ac3e23ff;
  border-radius: 2em;
  box-shadow: 0 4px 40px #0000003f;
}
</style>