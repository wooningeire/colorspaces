import {mod, Vec3} from "@/util";

import {Col, Xyz} from "./spaces/col-xyz-xyy-illuminants";
import {Lab, LchAb} from "./spaces/lab";

export const deltaE1976 = (col1: Vec3 | Col, col2: Vec3 | Col) => {
  const lab1 = Lab.from(col1) as Lab;
  const lab2 = Lab.from(col2, col1 instanceof Col ? col1.illuminant : undefined) as Lab;

  return Math.hypot(...lab1.map((comp, i) => lab2[i] - lab1[i]));
};

const turn = 2 * Math.PI;
const deg = (deg: number) => deg * Math.PI / 180;
const elseNan = (value: number, fallback: number) => isNaN(value) ? fallback : value;

export const deltaE2000 = (col1: Vec3 | Col, col2: Vec3 | Col, kL=1, kC=1, kH=1) => {
  const lab1 = Lab.from(col1) as Lab;
  const lab2 = Lab.from(col2, col1 instanceof Col ? col1.illuminant : undefined) as Lab;

  const lch1 = LchAb.from(lab1) as LchAb;
  const lch2 = LchAb.from(lab2) as LchAb;

  const lAdjDiff = lch2.l - lch1.l;

  const lAvg = (lch1.l + lch2.l) / 2;
  const cAvg = (lch1.c + lch2.c) / 2;

  const cAvgPow7 = cAvg**7;
  const aAdjustment = Math.sqrt(cAvgPow7 / (cAvgPow7 + 25**7));

  const aAdj1 = lab1.a * (3 - aAdjustment) / 2;
  const aAdj2 = lab2.a * (3 - aAdjustment) / 2;

  const cAdj1 = Math.hypot(aAdj1, lab1.b);
  const cAdj2 = Math.hypot(aAdj2, lab2.b);
  const cAdjAvg = (cAdj1 + cAdj2) / 2;
  const cAdjDiff = cAdj2 - cAdj1;

  const hAdj1 = mod(elseNan(Math.atan2(lab1.b, aAdj1), 0), turn);
  const hAdj2 = mod(elseNan(Math.atan2(lab2.b, aAdj2), 0), turn);

  const hAdjDiff = Math.abs(hAdj1 - hAdj2);
  const hAdjAvg = cAdj1 === 0 || cAdj2 === 0
      ? hAdj1 + hAdj2
      : (hAdj1 + hAdj2) / 2;

  const hAdjDiffChroma = 2 * Math.sqrt(cAdj1 * cAdj2) * Math.sin(hAdjDiff / 2);

  const t = 1
      - 0.17 * Math.cos(hAdjAvg - deg(30))
      + 0.24 * Math.cos(2 * hAdjAvg)
      + 0.32 * Math.cos(3 * hAdjAvg + deg(6))
      - 0.20 * Math.cos(4 * hAdjAvg - deg(63));

  const lCompensation = 1 + (0.015 * (lAvg - 50)**2) / Math.sqrt(20 + (lAvg - 50)**2);
  const cCompensation = 1 + 0.045 * cAdjAvg;
  const hCompensation = 1 + 0.015 * cAdjAvg * t;

  const cAdjAvgPow7 = cAdjAvg**7;
  const hueRot = -2 * Math.sqrt(cAdjAvgPow7 / (cAdjAvgPow7 + 25**7))
      * Math.sin(turn/6 * Math.exp(-1 * ((hAdjAvg*180/Math.PI - 275) / 25)**2));

  const lFinalDiff = lAdjDiff / kL / lCompensation;
  const cFinalDiff = cAdjDiff / kC / cCompensation;
  const hFinalDiff = hAdjDiffChroma / kH / hCompensation;

  return Math.sqrt(
    lFinalDiff**2
    + cFinalDiff**2
    + hFinalDiff**2
    + hueRot * cFinalDiff * hFinalDiff
  );
};

// https://www.w3.org/TR/WCAG20/#contrast-ratiodef
export const contrastRatio = (col1: Vec3 | Col, col2: Vec3 | Col) => {
  const xyz1 = Xyz.from(col1) as Xyz;
  const xyz2 = Xyz.from(col2, col1 instanceof Col ? col1.illuminant : undefined) as Xyz;

  const lum1 = Math.max(xyz1.y, xyz2.y);
  const lum2 = Math.min(xyz1.y, xyz2.y);

  return (lum1 + 0.05) / (lum2 + 0.05);
};

export const webglDiffDeclarations = `float deltaE1976(vec3 xyz0, vec2 illuminant0, vec3 xyz1, vec2 illuminant1) {
  vec3 lab0 = xyzToLab(xyz0, illuminant0, illuminant0);
  vec3 lab1 = xyzToLab(xyz1, illuminant1, illuminant0);

  return length(lab1 - lab0);
}

float deltaE2000(vec3 xyz0, vec2 illuminant0, vec3 xyz1, vec2 illuminant1) {
  vec3 lab0 = xyzToLab(xyz0, illuminant0, illuminant0);
  vec3 lab1 = xyzToLab(xyz1, illuminant1, illuminant0);

  vec3 lchab0 = lxxToLch(lab0);
  vec3 lchab1 = lxxToLch(lab1);

  float kL = 1.;
  float kC = 1.;
  float kH = 1.;
  

  float lAdjDiff = lchab1.x - lchab0.x;

  float lAvg = (lchab0.x + lchab1.x) / 2.;
  float cAvg = (lchab0.y + lchab1.y) / 2.;

  float cAvgPow2 = cAvg * cAvg;
  float cAvgPow7 = cAvgPow2 * cAvgPow2 * cAvgPow2 * cAvg;
  float aAdjustment = sqrt(cAvgPow7 / (cAvgPow7 + 6103515625.));

  float aAdj1 = lab0.y * (3. - aAdjustment) / 2.;
  float aAdj2 = lab1.y * (3. - aAdjustment) / 2.;

  float cAdj1 = sqrt(aAdj1 * aAdj1 + lab0.z * lab0.z);
  float cAdj2 = sqrt(aAdj2 * aAdj2 + lab1.z * lab1.z);
  float cAdjAvg = (cAdj1 + cAdj2) / 2.;
  float cAdjDiff = cAdj2 - cAdj1;

  float hAdj1 = mod(atan(lab0.z, aAdj1), REV);
  float hAdj2 = mod(atan(lab1.z, aAdj2), REV);

  float hAdjDiff = abs(hAdj1 - hAdj2);
  float hAdjAvg = cAdj1 == 0. || cAdj2 == 0.
      ? hAdj1 + hAdj2
      : (hAdj1 + hAdj2) / 2.;

  float hAdjDiffChroma = 2. * sqrt(cAdj1 * cAdj2) * sin(hAdjDiff / 2.);

  float t = 1.
      - 0.17 * cos(hAdjAvg - radians(30.))
      + 0.24 * cos(2. * hAdjAvg)
      + 0.32 * cos(3. * hAdjAvg + radians(6.))
      - 0.20 * cos(4. * hAdjAvg - radians(63.));

  float lAvgNormalized = lAvg - 50.;
  float lCompensation = 1. + (0.015 * lAvgNormalized * lAvgNormalized) / sqrt(20. + lAvgNormalized * lAvgNormalized);
  float cCompensation = 1. + 0.045 * cAdjAvg;
  float hCompensation = 1. + 0.015 * cAdjAvg * t;

  float cAdjAvgPow2 = cAdjAvg * cAdjAvg;
  float cAdjAvgPow7 = cAdjAvgPow2 * cAdjAvgPow2 * cAdjAvgPow2 * cAdjAvg;
  float hueRotExponent = (degrees(hAdjAvg) - 275.) / 25.;
  float hueRot = -2. * sqrt(cAdjAvgPow7 / (cAdjAvgPow7 + 6103515625.))
      * sin(REV/6. * exp(-hueRotExponent * hueRotExponent));

  float lFinalDiff = lAdjDiff / kL / lCompensation;
  float cFinalDiff = cAdjDiff / kC / cCompensation;
  float hFinalDiff = hAdjDiffChroma / kH / hCompensation;

  return sqrt(
    lFinalDiff * lFinalDiff
    + cFinalDiff * cFinalDiff
    + hFinalDiff * hFinalDiff
    + hueRot * cFinalDiff * hFinalDiff
  );
}

float contrastRatio(vec3 xyz0, vec2 illuminant0, vec3 xyz1, vec2 illuminant1) {
  vec3 adaptedXyz1 = adaptXyz(xyz1, illuminant1, illuminant0);

  float maxLum = max(xyz0.y, adaptedXyz1.y);
  float minLum = min(xyz0.y, adaptedXyz1.y);

  return (maxLum + 0.05) / (minLum + 0.05);
}`;