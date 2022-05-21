<script lang="ts" setup>
import {computed} from "vue";

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
	</div>
</template>