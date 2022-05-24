<template>
	<input type="number"
			v-model="field.value" />
	<label>{{field.label}}</label>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Field } from "../models/Node";

export default defineComponent({
	props: {
		field: {
			type: Field,
			required: true,
		},
	},
});
</script>

<style lang="scss" scoped>
</style>