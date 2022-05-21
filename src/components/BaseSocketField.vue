<script lang="ts" setup>
import {computed} from "vue";

import BaseEntry from "./input/BaseEntry.vue";
import EntryRgb from "./input/EntryRgb.vue";

import {Tree, Socket} from "@/models/Node";
import {externals} from "@/models/nodetypes";

const props = defineProps({
	socket: {
		type: Socket,
		required: true,
	},
});


const isOutputNode = computed(() => props.socket.node instanceof externals.DeviceTransformNode);
</script>

<template>
	<div class="socket-value-editor">
		<template v-if="socket.type === Socket.Type.Float">
			<BaseEntry v-model="socket.fieldValue"
					@update:modelValue="$emit('value-change')"
					
					:validate="isFinite" />
		</template>

		<template v-else-if="[Socket.Type.RgbRaw, Socket.Type.RgbRawOrColTransformed].includes(socket.type) && !isOutputNode">
			<EntryRgb v-model="socket.fieldValue"
					@update:modelValue="$emit('value-change')"

					:validate="color => color.every(comp => isFinite(comp))" />
		</template>

		<template v-else-if="socket.type === Socket.Type.Dropdown">
			<select v-model="socket.fieldValue"
					@change="$emit('value-change')">
				<option v-for="{text, value, selected} of socket.data.options"
						:value="value">
					{{text}}
				</option>
			</select>
		</template>
	</div>
</template>