import * as math from "mathjs";

import {Vec3} from "@/util";

import {Col, Xyz, Xy, illuminantsXy, chromaticAdaptationMat, adaptXyz, xyyToXyzNoAdapt, chromaticAdaptationTransforms} from "./col-xyz-xyy-illuminants";


export class Srgb extends Col {
	static readonly labels = ["R", "G", "B"];

	static readonly defaultIlluminant = illuminantsXy["2deg"]["D65"];

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
//#endregion