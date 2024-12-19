<script lang="ts" setup>
import * as cm from "$/color-management/";

import {settings} from "./store.svelte";

</script>

<template>
  <div class="settings-panel">
    <div class="container">
      <div>Device color space</div>
      <label>
        <select v-model="settings.deviceSpace">
          <option :value="cm.Srgb">sRGB</option>
          <option :value="cm.LinearSrgb">Linear sRGB</option>
          <option :value="cm.Rec709">Rec. 709</option>
          <option :value="cm.Xyz">XYZ</option>
        </select>
      </label>
    </div>

    <div class="container">
      <div>RGB scale</div>
      <label><select v-model="settings.rgbScale">
        <option :value="1">1</option>
        <option :value="100">100</option>
        <option :value="255">255</option>
        <option :value="65535">65535</option>
      </select></label>
    </div>

    <div class="container">
      <div>Hue scale</div>
      <label><select v-model="settings.hueScale">
        <option :value="1">1</option>
        <option :value="2 * Math.PI">2π</option>
        <option :value="100">100</option>
        <option :value="360">360</option>
      </select></label>
    </div>

    <div class="container">
      <div>Alpha for <span title="Colors that cannot be represented correctly using the currently selected device color space">out-of-gamut colors</span></div>
      <div class="control-row">
        <input type="range"
            min="0"
            max="1"
            step="any"

            id="settings-display-out-of-gamut"
            :value="settings.outOfGamutAlpha"
            @input="settings.outOfGamutAlpha = Number(($event.currentTarget as HTMLInputElement)!.value)" />
        {{ settings.outOfGamutAlpha.toFixed(3) }}
      </div>
    </div>

    <div class="container">
      <div>Alpha for <span title="Colors that cannot physically exist">imaginary colors</span></div>
      <div class="control-row">
        <input type="range"
            min="0"
            max="1"
            step="any"

            id="settings-display-out-of-gamut"
            :value="settings.imaginaryColorAlpha"
            @input="settings.imaginaryColorAlpha = Number(($event.currentTarget as HTMLInputElement)!.value)" />
        {{ settings.imaginaryColorAlpha.toFixed(3) }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-panel {
  height: 100%;

  padding: 2em;
  margin-right: 2em;
  

  background: #000000cf;
  border-radius: 2em 2em 0 0;
  border: solid #679df4;
  border-width: 4px 4px 0 4px;
  box-shadow: 0 4px 40px #0000003f;
}

.container {
  padding: 0 0.25em;

  & + .container {
    margin-top: 0.25em;
  }
}

.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  > div {
    display: flex;
    flex-flow: row;
    gap: 0.25em;
  }
}

span[title] {
  text-decoration: underline dotted;
  cursor: help;
}
</style>