import {datasets} from "./spectral-power-distribution";
import {Xyz} from "./spaces/col-xyz-xyy-illuminants";

import {Vec3} from "@/util";

const planck = 6.626_070_15e-34; // J / s
const speedOfLight = 299_792_458; // m
const boltzmann = 1.380_649e-23;

const radConst1 = 2 * Math.PI * planck * speedOfLight**2;
const radConst2 = planck * speedOfLight / boltzmann;

/**
 * 
 * @param wavelength in nm
 * @param temperature in K
 * @returns 
 */
const blackbodyExitance = (wavelength: number, temperature: number) =>
    radConst1 / wavelength**5 / Math.expm1(radConst2 / wavelength / temperature) / Math.PI;

export const blackbody = (temperature: number, datasetId: keyof typeof datasets) => new Xyz(
  Array(3).fill(0).map((_, i) =>
    [...datasets[datasetId].colorMatchingFunctions]
        .reduce((cumsum, [wavelength, cmf]) => cumsum + blackbodyExitance(wavelength * 1e-9, temperature) * 1e-9 * cmf[i], 0)
  ).map((comp, i) => comp / datasets[datasetId].colorMatchingFunctionsIntegrals[i]) as Vec3,
);

export const webglBlackbodyDeclarations = `#define PLANCK 6.62607015e-34
#define SPEED_OF_LIGHT 299792458.
#define BOLTZMANN 1.380649e-23

const float radConst1 = REV * PLANCK * SPEED_OF_LIGHT * SPEED_OF_LIGHT;
const float radConst2 = PLANCK * SPEED_OF_LIGHT / BOLTZMANN;

float blackbodyExitance(float wavelength, float temperature) {
  float wavelengthSq = wavelength * wavelength;
  float wavelengthQuint = wavelengthSq * wavelengthSq * wavelength;
  return radConst1 / wavelengthQuint / exp(radConst2 / wavelength / temperature) / PI;
}

vec3 blackbodyTemp2ToXyz(float temperature) {
  vec3 cumsum = vec3(0., 0., 0.);
  for (int wavelengthIndex = 0; wavelengthIndex < cmf2.length(); wavelengthIndex++) {
    float wavelength = float(wavelengthIndex + 360) * 1e-9;
    float exitance = blackbodyExitance(wavelength, temperature) * 1e-9;

    cumsum += vec3(
      exitance * cmf2[wavelengthIndex].x,
      exitance * cmf2[wavelengthIndex].y,
      exitance * cmf2[wavelengthIndex].z
    );
  }

  return cumsum / cmf2Integrals;
}

vec3 blackbodyTemp10ToXyz(float temperature) {
  vec3 cumsum = vec3(0., 0., 0.);
  for (int wavelengthIndex = 0; wavelengthIndex < cmf10.length(); wavelengthIndex++) {
    float wavelength = float(wavelengthIndex + 360) * 1e-9;
    float exitance = blackbodyExitance(wavelength, temperature) * 1e-9;

    cumsum += vec3(
      exitance * cmf10[wavelengthIndex].x,
      exitance * cmf10[wavelengthIndex].y,
      exitance * cmf10[wavelengthIndex].z
    );
  }

  return cumsum / cmf10Integrals;
}`;