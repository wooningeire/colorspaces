import {Color} from "../util";
import * as math from "mathjs";

/** Transfer function as defined by https://www.w3.org/Graphics/Color/srgb
 * 
 *  More precise constants as specified in https://en.wikipedia.org/wiki/SRGB
 */
export const linearCompToSrgb = (comp: number) =>
		comp <= 0.0031308
				? 12.9232102 * comp
				: 1.055 * comp**(1/2.4) - 0.055;

export const linearToSrgb = (linear: Color) => linear.map(linearCompToSrgb) as Color;

/** Inverse transfer function as defined by https://www.w3.org/Graphics/Color/srgb; uses ICC v4 profile formula
 */
// export const srgbCompToLinear = (comp: number) =>
// 		comp <= 0.04045
// 				? comp * 0.0772059 + 0.0025
// 				: (0.946879 * comp + 0.0520784)**2.4 + 0.0025;

/** Inverse transfer function as defined by https://www.w3.org/Graphics/Color/srgb; uses ICC v2 profile formula
 */
export const srgbCompToLinear = (comp: number) =>
		comp <= 0.04045
				? comp / 12.9232102
				: ((comp + 0.055) / 1.055)**(2.4);

export const srgbToLinear = (linear: Color) => linear.map(srgbCompToLinear) as Color;


export const xyz2degToLinear = (xyz: Color, /* illuminantXyz: Color */) => {
	//https://en.wikipedia.org/wiki/SRGB#From_CIE_XYZ_to_sRGB
	const mat = math.multiply([
		[+3.2406, -1.5372, -0.4986],
		[-0.9689, +1.8758, +0.0415],
		[+0.0557, -0.2040, +1.0570],
	], xyz);

	return mat as any as Color;
};

// https://www.mathworks.com/help/images/ref/whitepoint.html
const illuminantsXyz = {
	icc: [31595, 32768, 27030].map(comp => comp / 32768),
	d50: [0.9642956764295677, 1, 0.8251046025104602] as Color,
	d65: [0.9504559270516716, 1, 1.0890577507598784] as Color,//[0.9504, 1, 1.0888] as Color,
	e: [1, 1, 1],
};

const chromaticAdaptationTransforms = {
	"Bradford": [
		[ 0.8951,  0.2664, -0.1614],
		[-0.7502,  1.7135,  0.0367],
		[ 0.0389, -0.0685,  1.0296],
	],
};

/**
 * Adapted from https://github.com/colour-science/colour/blob/develop/colour/adaptation/vonkries.py#L44
 */
const chromaticAdaptationMat = (testWhiteXyz: Color, refWhiteXyz: Color, adaptationMatrix: number[][]) => {
	const newTestWhiteXyz = math.multiply(adaptationMatrix, testWhiteXyz);
	const newRefWhiteXyz = math.multiply(adaptationMatrix, refWhiteXyz);

	const scalarMatrix = math.diag(math.dotDivide(newRefWhiteXyz, newTestWhiteXyz) as math.MathCollection);

	const adaptationShifterMatrix = math.multiply(math.inv(adaptationMatrix), scalarMatrix);
	return math.multiply(adaptationShifterMatrix, adaptationMatrix);
};