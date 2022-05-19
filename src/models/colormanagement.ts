import {Color, Vec2, Vec3, mod} from "../util";
import * as math from "mathjs";


export class Col extends Array {
	constructor(
		readonly data: number[],
	) {
		super(data.length);
		this.push(...data);
		Object.freeze(this);
	}

	toXyz(): Xyz {
		throw new TypeError("Abstract method");
	}

	toSrgb(): Srgb {
		return this.toXyz().toSrgb();
	}
}

export class Xyz extends Col {
	constructor(data: Vec3) {
		super(data);
	}

	toXyz() {
		return new Xyz(this as any as Vec3);
	}

	toSrgb() {
		return xyzToLinear(this, illuminantsXy["2deg"]["D65"]).toSrgb();
	}
}
class Srgb extends Col {
	constructor(data: Vec3) {
		super(data);
	}

	toSrgb() {
		return new Srgb(this as any as Vec3);
	}
}

class LinearSrgb extends Col {
	constructor(data: Vec3) {
		super(data);
	}

	toSrgb() {
		return linearToSrgb(this);
	}
}

export class Xy extends Col {
	constructor(data: Vec2) {
		super(data);
	}

	toXyz(): Xyz {
		return xyyToXyz(this);
	}
}

export class Xyy extends Col {
	constructor(data: Vec3) {
		super(data);
	}

	toXyz(): Xyz {
		return xyyToXyz(this);
	}
}


/** Transfer function as defined by https://www.w3.org/Graphics/Color/srgb
 * 
 *  More precise constants as specified in https://en.wikipedia.org/wiki/SRGB
 */
export const linearCompToSrgb = (comp: number) =>
		comp <= 0.0031308
				? 12.9232102 * comp
				: 1.055 * comp**(1/2.4) - 0.055;

export const linearToSrgb = (linear: LinearSrgb) => new Srgb(linear.data.map(linearCompToSrgb) as Vec3);

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

export const srgbToLinear = (linear: Srgb) => new LinearSrgb(linear.map(srgbCompToLinear) as any as Vec3);


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


export const xyzToLinear = (xyz: Xyz, illuminantXy: Xy) => {
	const adaptedXyz = math.multiply(
		chromaticAdaptationMat(
			xyyToXyz(illuminantXy),
			xyyToXyz(illuminantsXy["2deg"]["D65"]),
			chromaticAdaptationTransforms["Bradford"],
		),
		xyz.data,
	);

	//https://en.wikipedia.org/wiki/SRGB#From_CIE_XYZ_to_sRGB
	const mat = math.multiply([
		[+3.2406, -1.5372, -0.4986],
		[-0.9689, +1.8758, +0.0415],
		[+0.0557, -0.2040, +1.0570],
	], adaptedXyz);

	return new LinearSrgb(mat as any as Vec3);
};

// https://en.wikipedia.org/wiki/CIE_1931_color_space#CIE_xy_chromaticity_diagram_and_the_CIE_xyY_color_space
export const xyyToXyz = ([x, y, lum=1]: Xy | Xyy) => y === 0
		? new Xyz([0, 0, 0])
		: new Xyz([
			lum / y * x,
			lum,
			lum / y * (1 - x - y),
		]);

// https://en.wikipedia.org/wiki/CIELAB_color_space#From_CIELAB_to_CIEXYZ
export const labToXyz = ([l, a, b]: Color, referenceWhiteXyz: Color) => {
	const tempY = (l + 16) / 116;
	const tempX = tempY + a / 500;
	const tempZ = tempY - b / 200;

	const compHelper = (comp: number) =>
			comp > 6/29
					? comp**3
					: 3 * (6/29)**2 * (comp - 4/29);

	return [
		compHelper(tempX) * referenceWhiteXyz[0],
		compHelper(tempY) * referenceWhiteXyz[1],
		compHelper(tempZ) * referenceWhiteXyz[2],
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

export const illuminantsXy = <{
	[standard: string]: {
		[illuminant: string]: Xy,
	},
}>{
	"2deg": {
		"A": new Xy([0.44758, 0.40745]),
        "B": new Xy([0.34842, 0.35161]),
        "C": new Xy([0.31006, 0.31616]),
        "D50": new Xy([0.34570, 0.35850]),
        "D55": new Xy([0.33243, 0.34744]),
        "D60": new Xy([0.321616709705268, 0.337619916550817]),
        "D65": new Xy([0.31270, 0.32900]),
        "D75": new Xy([0.29903, 0.31488]),
        "E": new Xy([1 / 3, 1 / 3]),
	},

	"10deg": {
		"A": new Xy([0.45117, 0.40594]),
        "B": new Xy([0.34980, 0.35270]),
        "C": new Xy([0.31039, 0.31905]),
        "D50": new Xy([0.34773, 0.35952]),
        "D55": new Xy([0.33412, 0.34877]),
        "D60": new Xy([0.322986926715820, 0.339275732345997]),
        "D65": new Xy([0.31382, 0.33100]),
        "D75": new Xy([0.29968, 0.31740]),
        "E": new Xy([1 / 3, 1 / 3]),
	},

	"": {
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
const chromaticAdaptationMat = (testWhiteXyz: Xyz, refWhiteXyz: Xyz, adaptationMatrix: number[][]) => {
	const newTestWhiteXyz = math.multiply(adaptationMatrix, testWhiteXyz);
	const newRefWhiteXyz = math.multiply(adaptationMatrix, refWhiteXyz);

	const scalarMatrix = math.diag(math.dotDivide(newRefWhiteXyz, newTestWhiteXyz) as math.MathCollection);

	const adaptationShifterMatrix = math.multiply(math.inv(adaptationMatrix), scalarMatrix);
	return math.multiply(adaptationShifterMatrix, adaptationMatrix);
};