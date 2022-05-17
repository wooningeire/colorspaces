import {Color, mod} from "../util";
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


export const cmyToRgb = (vec: Color) => vec.map(comp => 1 - comp);
export const rgbToCmy = cmyToRgb;

export const hslToRgb = ([hue, sat, lightness]: Color) => {
	if (sat === 0) return [lightness, lightness, lightness];

	const rgbCompDistribFromHue = (p: number, q: number, hue: number) => {
		hue = mod(hue, 1);

		if (hue < 1/6) return p + (q - p) * 6 * hue;
		if (hue < 3/6) return q;
		if (hue < 4/6) return p + (q - p) * (2/3 - hue) * 6;
		return p;
	};

	const q = lightness < 0.5
			? lightness * (1 + sat)
			: lightness * (1 - sat) + sat;
	const p = 2 * lightness - q;

    return [
		rgbCompDistribFromHue(p, q, hue + 1/3),
		rgbCompDistribFromHue(p, q, hue),
		rgbCompDistribFromHue(p, q, hue - 1/3),
	];
};

export const hsvToRgb = ([hue, sat, value]: Color) => {
	hue = mod(hue, 1) * 6;
	const segmentStart = Math.floor(hue);

	const plateau = value;
	const valley = value * (1 - sat);
	const falling = value * (1 - sat * (hue - segmentStart));
	const rising = value * (1 - sat * (1 - (hue - segmentStart)));
 
	if      (hue < 1) return [plateau, rising,  valley];
	else if (hue < 2) return [falling, plateau, valley];
	else if (hue < 3) return [valley,  plateau, rising];
	else if (hue < 4) return [valley,  falling, plateau];
	else if (hue < 5) return [rising,  valley,  plateau];
	else              return [plateau, valley,  falling];
};


export const xyz2degToLinear = (xyz: Color, /* illuminantXyz: Color */) => {
	//https://en.wikipedia.org/wiki/SRGB#From_CIE_XYZ_to_sRGB
	const mat = math.multiply([
		[+3.2406, -1.5372, -0.4986],
		[-0.9689, +1.8758, +0.0415],
		[+0.0557, -0.2040, +1.0570],
	], xyz);

	return mat as any as Color;
};

// https://en.wikipedia.org/wiki/CIE_1931_color_space#CIE_xy_chromaticity_diagram_and_the_CIE_xyY_color_space
export const xyyToXyz = ([x, y, lum]: Color) => y === 0
		? [0, 0, 0] as Color
		: [
			lum / y * x,
			lum,
			lum / y * (1 - x - y),
		] as Color;

// https://en.wikipedia.org/wiki/CIELAB_color_space#From_CIELAB_to_CIEXYZ
export const labToXyz = ([l, a, b]: Color, referenceWhite: Color) => {
	const tempY = (l + 16) / 116;
	const tempX = tempY + a / 500;
	const tempZ = tempY - b / 200;

	const compHelper = (comp: number) =>
			comp > 6/29
					? comp**3
					: 3 * (6/29)**2 * (comp - 4/29);

	return [
		compHelper(tempX) * referenceWhite[0],
		compHelper(tempY) * referenceWhite[1],
		compHelper(tempZ) * referenceWhite[2],
	] as Color;
};

// https://www.mathworks.com/help/images/ref/whitepoint.html
export const illuminantsXyz = <{
	[standard: string]: {
		[illuminant: string]: Color,
	},
}>{
	"2deg": {
		"ICC": [31595, 32768, 27030].map(comp => comp / 32768) as Color,
		"D50": [0.9642956764295677, 1, 0.8251046025104602],
		"D65": [0.9504559270516716, 1, 1.0890577507598784],//[0.9504, 1, 1.0888] as Color,
		"E": [1, 1, 1],
	},

	"10deg": {

	},
};

/**
 * From https://github.com/colour-science/colour/blob/develop/colour/adaptation/
 */
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