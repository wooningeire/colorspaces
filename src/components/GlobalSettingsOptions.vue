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

	<div class="container">
		<div>RGB scale</div>
		<select v-model="settings.rgbScale">
			<option :value="1">1</option>
			<option :value="100">100</option>
			<option :value="255">255</option>
			<option :value="65535">65535</option>
		</select>
	</div>

	<div class="container">
		<div>Hue scale</div>
		<select v-model="settings.hueScale">
			<option :value="1">1</option>
			<option :value="2 * Math.PI">2π</option>
			<option :value="100">100</option>
			<option :value="360">360</option>
		</select>
	</div>
</template>

<style lang="scss" scoped>
.container {
	padding: 0 0.25em;

	& + .container {
		margin-top: 0.25em;
	}
}
</style>