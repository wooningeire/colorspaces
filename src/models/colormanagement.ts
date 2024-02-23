export {Col, Xyz, Xyy, Xy, illuminantsXy} from "./colormanagement/spaces/col-xyz-xyy-illuminants";
export {Srgb, LinearSrgb, Rec709} from "./colormanagement/spaces/srgb";
export {AdobeRgb, LinearAdobeRgb} from "./colormanagement/spaces/adobe-rgb";
export {Lab, LchAb} from "./colormanagement/spaces/lab";
export {Luv, LchUv} from "./colormanagement/spaces/luv";
export {Oklab, OklchAb} from "./colormanagement/spaces/oklab";

export {spectralPowerDistribution, singleWavelength} from "./colormanagement/spectral-power-distribution";
export {blackbody} from "./colormanagement/blackbody";
export {cmyToRgb, rgbToCmy, rgbToHsl, hslToRgb, rgbToHsv, hsvToRgb, rgbToHwb, hwbToRgb} from "./colormanagement/rgb-models";

export * as difference from "./colormanagement/difference";

import {webglXyzDeclarations} from "./colormanagement/spaces/col-xyz-xyy-illuminants";
import {webglSrgbDeclarations} from "./colormanagement/spaces/srgb";
import {webglAdobeRgbDeclarations} from "./colormanagement/spaces/adobe-rgb";
import {webglLabDeclarations} from "./colormanagement/spaces/lab";
import {webglLuvDeclarations} from "./colormanagement/spaces/luv";
import {webglOklabDeclarations} from "./colormanagement/spaces/oklab";
export const webglDeclarations = [
  webglXyzDeclarations,
  webglSrgbDeclarations,
  webglAdobeRgbDeclarations,
  webglLabDeclarations,
  webglLuvDeclarations,
  webglOklabDeclarations,
].join("\n\n");