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