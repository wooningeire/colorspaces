<script lang="ts" setup>
import {ref, computed, PropType} from "vue";

import BaseEntry from "./input/BaseEntry.vue";
import EntryRgb from "./input/EntryRgb.vue";
import EntrySlider from "./input/EntrySlider.vue";

import {Socket, SocketType as St} from "@/models/Node";
import {externals} from "@/models/nodetypes";

const props = defineProps({
	socket: {
		type: Socket as PropType<Socket<any>>,
		required: true,
	},
});


const fileInput = ref(null as any as HTMLInputElement);

const readFile = (): Promise<ImageData> => new Promise(resolve => {
	const file = fileInput.value.files![0];
	if (!file) return;

	const reader = new FileReader();
	reader.addEventListener("load", () => {
		const canvas = document.createElement("canvas");
		canvas.width = 42;
		canvas.height = 42;
		const cx = canvas.getContext("2d")!;

		const image = new Image();
		image.addEventListener("load", () => {
			cx.drawImage(image, 0, 0, 42, 42);
			resolve(cx.getImageData(0, 0, 42, 42));
		}, {once: true});
		image.src = reader.result as string;
	}, {once: true});
	reader.readAsDataURL(file);
});


const isOutputNode = props.socket.node instanceof externals.DeviceTransformNode;


const isFloat = props.socket.type === St.Float;
const isVector = [St.RgbRaw, St.RgbRawOrColTransformed].includes(props.socket.type) && !isOutputNode;

const isEntry = isFloat || isVector;
</script>

<template>
	<div class="socket-value-editor"
			ref="editorContainer">
		<template v-if="isFloat">
			<EntrySlider v-model="(socket as Socket<St.Float>).fieldValue"
					@update:modelValue="$emit('value-change')"
					
					:validate="isFinite"
					
					v-bind="(socket as Socket<St.Float>).data.sliderProps" />
		</template>

		<template v-else-if="isVector">
			<EntryRgb v-model="(socket as Socket<St.RgbRaw | St.RgbRawOrColTransformed>).fieldValue"
					@update:modelValue="$emit('value-change')"

					:validate="(color: number[]) => color.every(comp => isFinite(comp))"
					
					:sliderProps="(socket as Socket<St.RgbRaw | St.RgbRawOrColTransformed>).data.sliderProps"
					:descs="props.socket.data.fieldText" />
		</template>

		<template v-else-if="socket.type === St.Dropdown">
			<select v-model="socket.fieldValue"
					@change="$emit('value-change')">
				<option v-for="{text, value} of (socket as Socket<St.Dropdown>).data.options"
						:value="value">
					{{text}}
				</option>
			</select>
		</template>

		<template v-else-if="socket.type === St.Image">
			<input type="file"
					accept="image/*"
					ref="fileInput"
					@change="async () => {
						socket.fieldValue = await readFile();
						$emit('value-change');
					}" />
		</template>
	</div>
</template>

<!-- <style lang="scss">
.socket-value-editor.entry {
	border-radius: 4px;
	overflow: hidden;
}
</style> -->