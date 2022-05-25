<script lang="ts" setup>
import {ref, computed} from "vue";

import BaseEntry from "./input/BaseEntry.vue";
import EntryRgb from "./input/EntryRgb.vue";

import {Socket, SocketType as St} from "@/models/Node";
import {externals} from "@/models/nodetypes";

const props = defineProps({
	socket: {
		type: Socket,
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

const console = window.console;


const isOutputNode = computed(() => props.socket.node instanceof externals.DeviceTransformNode);
</script>

<template>
	<div class="socket-value-editor">
		<template v-if="socket.type === St.Float">
			<BaseEntry v-model="socket.fieldValue"
					@update:modelValue="$emit('value-change')"
					
					:validate="isFinite" />
		</template>

		<template v-else-if="[St.RgbRaw, St.RgbRawOrColTransformed].includes(socket.type) && !isOutputNode">
			<EntryRgb v-model="(socket as Socket<St.RgbRaw | St.RgbRawOrColTransformed>).fieldValue"
					@update:modelValue="$emit('value-change')"

					:validate="(color: number[]) => color.every(comp => isFinite(comp))" />
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