import * as math from "mathjs";

import {Vec3} from "@/util";

import {Col, Xyz, Xy, illuminantsXy, chromaticAdaptationMat, adaptXyz, xyyToXyzNoAdapt, chromaticAdaptationTransforms} from "./col-xyz-xyy-illuminants";


const isZeroToOne = (col: Col) => col.every(comp => 0 <= comp && comp <= 1);

export class Srgb extends Col {
	static readonly labels = ["R", "G", "B"];

	static readonly defaultIlluminant = illuminantsXy["2deg"]["D65"];

	constructor(data: Vec3) {
		super(data, illuminantsXy["2deg"]["D65"]);
	}

	static fromCol(col: Col) {
		if (col instanceof LinearSrgb) {
			return linToGammaSrgb(col);
		} else if (col instanceof Srgb) {
			return new Srgb(col as any as Vec3);
		}
		return super.fromCol(col, this.defaultIlluminant);
	}

	static fromXyz(xyz: Xyz): Srgb {
		return linToGammaSrgb(xyzToLinear(xyz));
	}

	toXyz(newIlluminant: Xy=this.illuminant) {
		return linearToXyz(gammaToLinSrgb(this), newIlluminant);
	}

	inGamut(): boolean {
		return isZeroToOne(this);
	}
}

export class LinearSrgb extends Col {
	static readonly labels = ["R", "G", "B"];
	
	constructor(data: Vec3) {
		super(data, illuminantsXy["2deg"]["D65"]);
	}

	static fromCol(col: Col) {
		return col instanceof Srgb
				? gammaToLinSrgb(col)
				: super.fromCol(col, this.defaultIlluminant);
	}

	static fromXyz(xyz: Xyz): LinearSrgb {
		return xyzToLinear(xyz);
	}

	toXyz(newIlluminant: Xy=this.illuminant) {
		return linearToXyz(this, newIlluminant);
	}

	inGamut(): boolean {
		return isZeroToOne(this);
	}
}

export class Rec709 extends Col {
	static readonly labels = ["R", "G", "B"];

	static readonly defaultIlluminant = illuminantsXy["2deg"]["D65"];

	constructor(data: Vec3) {
		super(data, new.target.defaultIlluminant);
	}

	static fromCol(col: Col) {
		if (col instanceof LinearSrgb) {
			return linToRec709(col);
		} else if (col instanceof Srgb) {
			return new Rec709(col as any as Vec3);
		}
		return super.fromCol(col);
	}

	static fromXyz(xyz: Xyz): Rec709 {
		return linToRec709(xyzToLinear(xyz));
	}

	toXyz(newIlluminant: Xy=this.illuminant) {
		return linearToXyz(rec709ToLin(this), newIlluminant);
	}

	inGamut(): boolean {
		return isZeroToOne(this);
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

const gammaToLinSrgb = (srgb: Srgb) => new LinearSrgb(srgb.map(gammaCompToLinSrgb) as any as Vec3);

const linCompToRec709 = (comp: number) =>
		comp < 0.018
				? 4.5 * comp
				: 1.099 * comp**(1/2.2) - 0.099;

const linToRec709 = (linear: LinearSrgb) => new Rec709(linear.map(linCompToRec709) as Vec3);

const rec709CompToLin = (comp: number) =>
		comp < 0.081
				? comp / 4.5
				: ((comp + 0.099) / 1.099)**2.2;

const rec709ToLin = (rec709: Rec709) => new LinearSrgb(rec709.map(rec709CompToLin) as Vec3);


export const xyzToLinear = (xyz: Xyz) => {
	const adaptedXyz = adaptXyz(xyz, illuminantsXy["2deg"]["D65"]);

	//https://en.wikipedia.org/wiki/SRGB#From_CIE_XYZ_to_sRGB
	const mat = math.multiply([
		[+3.2404542, -1.5371385, -0.4985314],
		[-0.9692660, +1.8760108, +0.0415560],
		[+0.0556434, -0.2040259, +1.0572252],
	], adaptedXyz);

	return new LinearSrgb(mat as any as Vec3);
};

export const linearToXyz = (linear: LinearSrgb, newIlluminant: Xy) => {
	//http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
	const xyz = math.multiply([
		[+0.4124564, +0.3575761, +0.1804375],
		[+0.2126729, +0.7151522, +0.0721750],
		[+0.0193339, +0.1191920, +0.9503041],
	], linear);

	return adaptXyz(new Xyz(xyz as any as Vec3, linear.illuminant), newIlluminant);
};
//#endregion