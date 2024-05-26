export {Col, Xyz, Xyy, Xy, illuminantsXy} from "./spaces/col-xyz-xyy-illuminants";
export {Srgb, LinearSrgb, Rec709} from "./spaces/srgb";
export {AdobeRgb, LinearAdobeRgb} from "./spaces/adobe-rgb";
export {Cielab as Cielab, lxyToLch, lchToLxy} from "./spaces/lab";
export {Cieluv as Cieluv} from "./spaces/luv";
export {Oklab} from "./spaces/oklab";

export {spectralPowerDistribution, singleWavelength} from "./spectral-power-distribution";
export {blackbody} from "./blackbody";
export {cmyToRgb, rgbToCmy, rgbToHsl, hslToRgb, rgbToHsv, hsvToRgb, rgbToHwb, hwbToRgb, rgbToHsi, hsiToRgb} from "./rgb-models";

export * as difference from "./difference";

import {webglXyzDeclarations} from "./spaces/col-xyz-xyy-illuminants";
import {webglSrgbDeclarations} from "./spaces/srgb";
import {webglAdobeRgbDeclarations} from "./spaces/adobe-rgb";
import {webglLabDeclarations} from "./spaces/lab";
import {webglLuvDeclarations} from "./spaces/luv";
import {webglOklabDeclarations} from "./spaces/oklab";
import {webglRgbDeclarations} from "./rgb-models";
import {webglCmfDeclarations} from "./spectral-power-distribution";
import {webglBlackbodyDeclarations} from "./blackbody";
import {webglDiffDeclarations} from "./difference";
import {webglRandomDeclarations} from "./random";
export const webglDeclarations = [
  webglXyzDeclarations,
  webglSrgbDeclarations,
  webglAdobeRgbDeclarations,
  webglLabDeclarations,
  webglLuvDeclarations,
  webglOklabDeclarations,
  webglRgbDeclarations,
  webglCmfDeclarations,
  webglBlackbodyDeclarations,
  webglDiffDeclarations,
  webglRandomDeclarations,
].join("\n\n");