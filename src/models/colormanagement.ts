import {Color, Vec2, Vec3, mod} from "../util";
import * as math from "mathjs";

//#region Color data types
/**
 * Represents a color in an absolute color space.
 * Subclasses should implement the methods `static from`, `static fromXyz`, and `toXyz`.
 */
export class Col extends Array {
	static readonly [Symbol.species] = Array;
	static readonly labels: string[] = [];

	constructor(
		/* readonly */ data: number[],
		readonly illuminant: Xy,
	) {
		super();
		this.push(...data);
		// Object.freeze(this);
	}

	static from(dataOrCol: Vec3 | Col, illuminant: Xy): InstanceType<typeof this> {
		if (dataOrCol instanceof Col) {
			return this.fromXyz(dataOrCol.toXyz(illuminant));
		} else {
			return new this(dataOrCol, illuminant);
		}
	}

	static fromXyz(xyz: Xyz): Col {
		throw new TypeError("Abstract method / not implemented");
	}

	toXyz(illuminant: Xy=this.illuminant): Xyz {
		throw new TypeError("Abstract method / not implemented");
	}
}

export class Xyz extends Col {
	static readonly labels = ["X", "Y", "Z"];

	constructor(data: Vec3, illuminant: Xy=illuminantsXy["2deg"]["E"]) {
		if (data.length !== 3) throw new TypeError("Data must have 3 components");

		super(data, illuminant);
	}

	static from(dataOrCol: Vec3 | Col, illuminant: Xy): Xyz {
		if (dataOrCol instanceof Col) {
			return dataOrCol.toXyz(illuminant);
		} else {
			return new Xyz(dataOrCol, illuminant);
		}
	}

	static fromXyz(xyz: Xyz): Xyz {
		return new Xyz(xyz as any as Vec3, xyz.illuminant);
	}

	toXyz(illuminant: Xy=this.illuminant) {
		return adaptXyz(this, illuminant);
	}
}

export class Srgb extends Col {
	static readonly labels = ["R", "G", "B"];

	constructor(data: Vec3) {
		super(data, illuminantsXy["2deg"]["D65"]);
	}

	static from(dataOrCol: Vec3 | Col): Srgb {
		if (dataOrCol instanceof LinearSrgb) {
			return linToGammaSrgb(dataOrCol);
		} else if (dataOrCol instanceof Srgb) {
			return new Srgb(dataOrCol as any as Vec3);
		} else if (dataOrCol instanceof Col) {
			return this.fromXyz(dataOrCol.toXyz(illuminantsXy["2deg"]["D65"]));
		} else {
			return new Srgb(dataOrCol);
		}
	}

	static fromXyz(xyz: Xyz): Srgb {
		return linToGammaSrgb(xyzToLinear(xyz, xyz.illuminant));
	}

	toXyz(illuminant: Xy=this.illuminant) {
		return linearToXyz(gammaToLinSrgb(this), illuminant);
	}
}

export class LinearSrgb extends Col {
	static readonly labels = ["R", "G", "B"];
	
	constructor(data: Vec3) {
		super(data, illuminantsXy["2deg"]["D65"]);
	}

	static from(dataOrCol: Vec3 | Col): LinearSrgb {
		return dataOrCol instanceof Col
				? dataOrCol instanceof Srgb
						? gammaToLinSrgb(dataOrCol)
						: this.fromXyz(dataOrCol.toXyz(illuminantsXy["2deg"]["D65"]))
				: new LinearSrgb(dataOrCol);
	}

	static fromXyz(xyz: Xyz): LinearSrgb {
		return xyzToLinear(xyz, xyz.illuminant);
	}

	toXyz(illuminant: Xy=this.illuminant) {
		return linearToXyz(this, illuminant);
	}
}

export class AdobeRgb extends Col {
	static readonly labels = ["R", "G", "B"];

	constructor(data: Vec3) {
		super(data, illuminantsXy["2deg"]["D65"]);
	}

	static from(dataOrCol: Vec3 | Col): AdobeRgb {
		if (dataOrCol instanceof LinearAdobeRgb) {
			return linToGammaSrgb(dataOrCol);
		} else if (dataOrCol instanceof AdobeRgb) {
			return new AdobeRgb(dataOrCol as any as Vec3);
		} else if (dataOrCol instanceof Col) {
			return this.fromXyz(dataOrCol.toXyz(illuminantsXy["2deg"]["D65"]));
		} else {
			return new AdobeRgb(dataOrCol);
		}
	}

	static fromXyz(xyz: Xyz): AdobeRgb {
		return linToGammaAdobeRgb(xyzToLinAdobeRgb(xyz, xyz.illuminant));
	}

	toXyz(illuminant: Xy=this.illuminant) {
		return linAdobeRgbToXyz(gammaToLinAdobeRgb(this), illuminant);
	}
}

export class LinearAdobeRgb extends Col {
	static readonly labels = ["R", "G", "B"];

	constructor(data: Vec3) {
		super(data, illuminantsXy["2deg"]["D65"]);
	}

	static from(dataOrCol: Vec3 | Col): LinearAdobeRgb {
		return dataOrCol instanceof Col
				? dataOrCol instanceof AdobeRgb
						? gammaToLinAdobeRgb(dataOrCol)
						: this.fromXyz(dataOrCol.toXyz(illuminantsXy["2deg"]["D65"]))
				: new LinearAdobeRgb(dataOrCol);
	}

	static fromXyz(xyz: Xyz): LinearAdobeRgb {
		return xyzToLinAdobeRgb(xyz, xyz.illuminant);
	}

	toXyz(illuminant: Xy=this.illuminant) {
		return linAdobeRgbToXyz(this, illuminant);
	}
}

export class Xy extends Col {
	constructor(data: Vec2, illuminant: Xy=illuminantE) {
		super(data, illuminant);
	}

	toXyz(illuminant: Xy=this.illuminant): Xyz {
		return xyyToXyz(this, illuminant);
	}
}

export class Xyy extends Col {
	static readonly labels = ["x", "y", "Y"];

	constructor(data: Vec3, illuminant: Xy=illuminantE) {
		super(data, illuminant);
	}

	static fromXyz(xyz: Xyz): Xyy {
		return xyzToXyy(xyz, xyz.illuminant);
	}

	toXyz(illuminant: Xy=this.illuminant): Xyz {
		return xyyToXyz(this, illuminant);
	}
}

const illuminantE = new Xy([1/3, 1/3], null as any as Xy);
Object.assign(illuminantE, {illuminant: illuminantE});

export class Lab extends Col {
	static readonly labels = ["L*", "a*", "b*"];

	constructor(data: Vec3, illuminant: Xy) {
		super(data, illuminant);
	}

	static fromXyz(xyz: Xyz): Lab {
		return xyzToLab(xyz, xyz.illuminant);
	}

	toXyz(illuminant: Xy=this.illuminant): Xyz {
		return labToXyz(this, illuminant);
	}
}

export class LchAb extends Col {
	static readonly labels = ["L*", "C", "h"];

	constructor(data: Vec3, illuminant: Xy) {
		super(data, illuminant);
	}
}
//#endregion


//#region Conversion functions
/** Transfer function as defined by https://www.w3.org/Graphics/Color/srgb
 * 
 *  More precise constants as specified in https://en.wikipedia.org/wiki/SRGB
 */
const linCompToGammaSrgb = (comp: number) =>
		comp <= 0.0031308
				? 12.9232102 * comp
				: 1.055 * comp**(1/2.4) - 0.055;

const linToGammaSrgb = (linear: LinearSrgb) => new Srgb(linear.map(linCompToGammaSrgb) as Vec3);

/** Inverse transfer function as defined by https://www.w3.org/Graphics/Color/srgb; uses ICC v4 profile formula
 */
// export const srgbCompToLinear = (comp: number) =>
// 		comp <= 0.04045
// 				? comp * 0.0772059 + 0.0025
// 				: (0.946879 * comp + 0.0520784)**2.4 + 0.0025;

/** Inverse transfer function as defined by https://www.w3.org/Graphics/Color/srgb; uses ICC v2 profile formula
 */
const gammaCompToLinSrgb = (comp: number) =>
		comp <= 0.04045
				? comp / 12.9232102
				: ((comp + 0.055) / 1.055)**(2.4);

const gammaToLinSrgb = (linear: Srgb) => new LinearSrgb(linear.map(gammaCompToLinSrgb) as any as Vec3);


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


export const xyzToLinear = (xyz: Xyz, illuminant: Xy) => {
	const adaptedXyz = math.multiply(
		chromaticAdaptationMat(
			xyyToXyzNoAdapt(illuminant),
			xyyToXyzNoAdapt(illuminantsXy["2deg"]["D65"]),
			chromaticAdaptationTransforms["Bradford"],
		),
		xyz,
	);

	//https://en.wikipedia.org/wiki/SRGB#From_CIE_XYZ_to_sRGB
	const mat = math.multiply([
		[+3.2404542, -1.5371385, -0.4985314],
		[-0.9692660, +1.8760108, +0.0415560],
		[+0.0556434, -0.2040259, +1.0572252],
	], adaptedXyz);

	return new LinearSrgb(mat as any as Vec3);
};

export const linearToXyz = (linear: LinearSrgb, illuminant: Xy) => {
	//http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
	const mat = math.multiply([
		[+0.4124564, +0.3575761, +0.1804375],
		[+0.2126729, +0.7151522, +0.0721750],
		[+0.0193339, +0.1191920, +0.9503041],
	], linear);

	return adaptXyz(new Xyz(mat as any as Vec3, illuminantsXy["2deg"]["D65"]), illuminant);
};

// https://en.wikipedia.org/wiki/CIE_1931_color_space#CIE_xy_chromaticity_diagram_and_the_CIE_xyY_color_space
export const xyyToXyz = (xyy: Xy | Xyy, illuminant: Xy=xyy.illuminant) => {
	const [x, y, lum=1] = xyy;
	
	const xyz = y === 0
			? new Xyz([0, 0, 0], xyy.illuminant)
			: new Xyz([
				lum / y * x,
				lum,
				lum / y * (1 - x - y),
			], xyy.illuminant);

	return adaptXyz(xyz, illuminant);
};

const xyyToXyzNoAdapt = (xyy: Xy | Xyy) => {
	const [x, y, lum=1] = xyy;
	
	return y === 0
			? new Xyz([0, 0, 0], xyy.illuminant)
			: new Xyz([
				lum / y * x,
				lum,
				lum / y * (1 - x - y),
			], xyy.illuminant);
};

export const xyzToXyy = (xyz: Xyz, illuminant: Xy=xyz.illuminant) => {
	const [x, y, z] = adaptXyz(xyz, illuminant);

	const dot1 = x + y + z;

	return dot1 === 0
			? new Xyy([0, 0, 0], illuminant)
			: new Xyy([
				x / dot1,
				y / dot1,
				y,
			], illuminant);
};

// https://en.wikipedia.org/wiki/CIELAB_color_space#From_CIELAB_to_CIEXYZ
const labToXyz = (lab: Lab, illuminant: Xy) => {
	const [l, a, b] = lab;

	const tempY = (l + 16) / 116;
	const tempX = tempY + a / 500;
	const tempZ = tempY - b / 200;

	const compHelper = (comp: number) =>
			comp > 6/29
					? comp**3
					: 3 * (6/29)**2 * (comp - 4/29);

	const referenceWhiteXyz = xyyToXyzNoAdapt(lab.illuminant);

	return adaptXyz(new Xyz([
		compHelper(tempX) * referenceWhiteXyz[0],
		compHelper(tempY) * referenceWhiteXyz[1],
		compHelper(tempZ) * referenceWhiteXyz[2],
	], lab.illuminant), illuminant);
};

const xyzToLab = (xyz: Xyz, illuminant: Xy) => {
	const adaptedXyz = adaptXyz(xyz, illuminant);

	const referenceWhiteXyz = xyyToXyzNoAdapt(illuminant);

	const tempXyz = adaptedXyz.map((comp, i) => adaptedXyz[i] / referenceWhiteXyz[i]);

	const compHelper = (comp: number) =>
			comp > (6/29)**3
					? comp**(1/3)
					: comp / (3 * (6/29)**2) + 4/29;

	const newXyz = tempXyz.map(compHelper);

	return new Lab([
		116 * newXyz[1] - 16,
		500 * (newXyz[0] - newXyz[1]),
		200 * (newXyz[1] - newXyz[2]),
	], illuminant);
};

const xyzToLinAdobeRgb = (xyz: Xyz, illuminant: Xy) => {
	const adaptedXyz = math.multiply(
		chromaticAdaptationMat(
			xyyToXyzNoAdapt(illuminant),
			xyyToXyzNoAdapt(illuminantsXy["2deg"]["D65"]),
			chromaticAdaptationTransforms["Bradford"],
		),
		xyz,
	);

	//http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
	const mat = math.multiply([
		[+2.0413690, -0.5649464, -0.3446944],
		[-0.9692660, +1.8760108, +0.0415560],
		[+0.0134474, -0.1183897, +1.0154096],
	], adaptedXyz);

	return new LinearAdobeRgb(mat as any as Vec3);
};

const linAdobeRgbToXyz = (linAdobe: LinearAdobeRgb, illuminant: Xy) => {
	//http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
	const mat = math.multiply([
		[+0.5767309, +0.1855540, +0.1881852],
		[+0.2973769, +0.6273491, +0.0752741],
		[+0.0270343, +0.0706872, +0.9911085],
	], linAdobe);

	return adaptXyz(new Xyz(mat as any as Vec3, illuminantsXy["2deg"]["D65"]), illuminant);
};

// https://www.adobe.com/digitalimag/pdfs/AdobeRGB1998.pdf sec 4.3.1.2
const linCompToGammaAdobeRgb = (comp: number) => comp**(1 / (2 + 51/256));
const gammaCompToLinAdobeRgb = (comp: number) => comp**(2 + 51/256);

const linToGammaAdobeRgb = (linear: LinearAdobeRgb) => new AdobeRgb(linear.map(linCompToGammaAdobeRgb) as Vec3);
const gammaToLinAdobeRgb = (adobe: AdobeRgb) => new LinearAdobeRgb(adobe.map(gammaCompToLinAdobeRgb) as Vec3);


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
        "E": new Xy([1/3, 1/3]),
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
        "E": new Xy([1/3, 1/3]),
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

const adaptXyz = (origColor: Xyz, targetIlluminant: Xy): Xyz => new Xyz(math.multiply(
	chromaticAdaptationMat(
		xyyToXyzNoAdapt(origColor.illuminant),
		xyyToXyzNoAdapt(targetIlluminant),
		chromaticAdaptationTransforms["Bradford"],
	),
	origColor,
) as any as Vec3, targetIlluminant);

export namespace difference {
	export const deltaE1976 = (col1: Vec3 | Col, col2: Vec3 | Col) => {
		const lab1 = Lab.from(col1, col1 instanceof Col ? col1.illuminant : illuminantE);
		const lab2 = Lab.from(col2, col2 instanceof Col ? col2.illuminant : illuminantE);

		return Math.hypot(...lab1.map((comp, i) => lab2[i] - lab1[i]));
	}
}