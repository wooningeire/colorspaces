<script lang="ts" setup>
import {ref, computed, PropType} from "vue";

import BaseEntry from "./input/BaseEntry.vue";
import EntryRgb from "./input/EntryRgb.vue";
import EntrySlider from "./input/EntrySlider.vue";

import {settings, tree} from "./store";

import {Socket, SocketType as St, SocketFlag, Tree} from "@/models/Node";
import {externals} from "@/models/nodetypes";

const props = defineProps<{
  socket: Socket,
}>();
const emit = defineEmits<{
  (event: "value-change", requiresShaderReload: boolean): void,
}>();

const fileInput = ref(null as any as HTMLInputElement);

const readFile = (): Promise<ImageData> => new Promise(resolve => {
  const file = fileInput.value.files![0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const canvas = document.createElement("canvas");
    const cx = canvas.getContext("2d")!;

    const image = new Image();
    image.addEventListener("load", () => {
      canvas.width = image.width;
      canvas.height = image.height;
      cx.drawImage(image, 0, 0, image.width, image.height);
      resolve(cx.getImageData(0, 0, image.width, image.height));
    }, {once: true});
    image.src = reader.result as string;
  }, {once: true});
  reader.readAsDataURL(file);
});

const onValueChange = (requiresShaderReload=false) => {
  props.socket.onValueChange(tree as Tree);
  emit("value-change", requiresShaderReload);
};


const isOutputNode = props.socket.node instanceof externals.DeviceTransformNode;


const isFloat = props.socket.type === St.Float;
const isVector = [St.Vector, St.VectorOrColor].includes(props.socket.type) && !isOutputNode;

const isEntry = isFloat || isVector;

const isRgb = Boolean(props.socket.flags & SocketFlag.Rgb);
const isHue = Boolean(props.socket.flags & SocketFlag.Hue);

type FloatSocket = Socket<St.Float>;
type VectorSocket = Socket<St.Vector | St.VectorOrColor>;
</script>

<template>
  <div class="socket-value-editor"
      ref="editorContainer">
    <template v-if="isFloat">
      <EntrySlider v-model="(socket as FloatSocket).fieldValue"
          @update:modelValue="onValueChange(socket.valueChangeRequiresShaderReload)"
          
          :convertIn="
            isRgb ? (value: number) => value / settings.rgbScale :
            isHue ? (value: number) => value / settings.hueScale :
            undefined
          "
          :convertOut="
            isRgb ? (value: number) => value * settings.rgbScale :
            isHue ? (value: number) => value * settings.hueScale :
            undefined
          "
          :validate="isFinite"

          :max="
            isRgb ? settings.rgbScale :
            isHue ? settings.hueScale :
            undefined
          "
          
          v-bind="(socket as FloatSocket).data.sliderProps" />
    </template>

    <template v-else-if="isVector">
      <EntryRgb v-model="(socket as VectorSocket).fieldValue"
          @update:modelValue="onValueChange(socket.valueChangeRequiresShaderReload)"

          :convertIn="
            isRgb ? (color: number[]) => color.map(value => value / settings.rgbScale) :
            isHue ? (color: number[]) => color.map(value => value / settings.hueScale) :
            undefined
          "
          :convertOut="
            isRgb ? (color: number[]) => color.map(value => value * settings.rgbScale) :
            isHue ? (color: number[]) => color.map(value => value * settings.hueScale) :
            undefined
          "
          :validate="(color: number[]) => color.every(comp => isFinite(comp))"
          
          :maxes="
            isRgb ? (socket as VectorSocket).fieldValue.map(() => settings.rgbScale) :
            isHue ? (socket as VectorSocket).fieldValue.map(() => settings.hueScale) :
            undefined
          "
          :sliderProps="(socket as VectorSocket).data.sliderProps"
          :descs="socket.data.fieldText" />
    </template>

    <template v-else-if="socket.type === St.Dropdown">
      <label>
        <select v-model="socket.fieldValue"
            @change="onValueChange(socket.valueChangeRequiresShaderReload)">
          <option v-for="{text, value} of (socket as Socket<St.Dropdown>).data.options"
              :value="value">
            {{text}}
          </option>
        </select>
      </label>
    </template>

    <template v-else-if="socket.type === St.Image">
      <input type="file"
          accept="image/*"
          ref="fileInput"
          @change="async () => {
            socket.fieldValue = await readFile();
            onValueChange(socket.valueChangeRequiresShaderReload);
          }" />
    </template>

    <template v-else-if="socket.type === St.Bool">
      <input type="checkbox"
          v-model="socket.fieldValue"
          @change="onValueChange(socket.valueChangeRequiresShaderReload)" />
    </template>
  </div>
</template>

<!-- <style lang="scss">
.socket-value-editor.entry {
  border-radius: 4px;
  overflow: hidden;
}
</style> -->