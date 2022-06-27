<script lang="ts" setup>
import * as cm from "@/models/colormanagement";

import {settings} from "./store";
</script>

<template>
	<div class="container">
		<div>Device color space</div>
		<select v-model="settings.deviceSpace">
			<option :value="cm.Srgb">sRGB</option>
			<option :value="cm.LinearSrgb">Linear sRGB</option>
			<option :value="cm.Rec709">Rec. 709</option>
			<option :value="cm.Xyz">XYZ</option>
		</select>
	</div>
</template>

<style lang="scss" scoped>
.container {
	padding: 0 0.25em;
}
</style>