<script lang="ts" setup>
import * as cm from "@/models/colormanagement";

import {settings} from "./store";

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
      <div>Alpha for out-of-gamut colors</div>
      <input type="range"
          min="0"
          max="1"
          step="any"

          id="settings-display-out-of-gamut"
          v-model="settings.outOfGamutAlpha" />
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

  > div {
    display: flex;
    flex-flow: row;
    gap: 0.25em;
  }
}
</style>