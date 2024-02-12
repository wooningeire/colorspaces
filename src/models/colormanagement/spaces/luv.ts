import {Vec3, mod} from "@/util";

import {Col, Xyz, Xy, adaptXyz, xyyToXyzNoAdapt} from "./col-xyz-xyy-illuminants";


//#region Types
export class Luv extends Col {
	// static readonly labels = ["L*", "u*", "v*"];

	constructor(data: Vec3, newIlluminant: Xy) {
		super(data, newIlluminant);
	}

	static fromXyz(xyz: Xyz): Luv {
		return xyzToLuv(xyz, xyz.illuminant);
	}

	toXyz(newIlluminant: Xy=this.illuminant): Xyz {
		return luvToXyz(this, newIlluminant);
	}

	get l() { return this[0]; }
	get u() { return this[1]; }
	get v() { return this[2]; }
}

export class LchUv extends Col {
	// static readonly labels = ["L*", "C*", "h"];

	constructor(data: Vec3, newIlluminant: Xy) {
		super(data, newIlluminant);
	}

	static fromXyz(xyz: Xyz): LchUv {
		return luvToLchUv(xyzToLuv(xyz, xyz.illuminant));
	}

	toXyz(newIlluminant: Xy=this.illuminant): Xyz {
		return luvToXyz(lchUvToLuv(this), newIlluminant);
	}

	get l() { return this[0]; }
	get c() { return this[1]; }
	get h() { return this[2]; }
}
//#endregion

//#region Conversion functions
const uv = (xyz: Xyz) => {
	const denominator = xyz.x + (15 * xyz.y) + (3 * xyz.z);

	return [
		4 * xyz.x / denominator,
		9 * xyz.y / denominator,
	];
};

const luvToXyz = (luv: Luv, newIlluminant: Xy) => {
	const tempY = (luv.l + 16) / 116;

	const y = 
			tempY > 6/29
					? tempY**3
					: 3 * (6/29)**2 * (tempY - 4/29);

	const referenceWhite = xyyToXyzNoAdapt(luv.illuminant);

	const [referenceU, referenceV] = uv(referenceWhite);

	const tempU = luv.u / (13 * luv.l) + referenceU;
	const tempV = luv.v / (13 * luv.l) + referenceV;
	
	const x = -9 * y * tempU / ((tempU - 4) * tempV - tempU * tempV);
	const z = (9 * y - (15 * tempV * y) - (tempV * x)) / (3 * tempV);

	return adaptXyz(new Xyz([x, y, z], luv.illuminant), newIlluminant);
};

const xyzToLuv = (xyz: Xyz, newIlluminant: Xy) => {
	const adaptedXyz = adaptXyz(xyz, newIlluminant);
	const referenceWhite = xyyToXyzNoAdapt(newIlluminant);

	const relativeLum = adaptedXyz.y / referenceWhite.y;

	const l =
			relativeLum > (6/29)**3
					? relativeLum**(1/3) * 116 - 16
					: relativeLum * (29/3)**3;

	const [tempU, tempV] = uv(adaptedXyz);
	const [referenceU, referenceV] = uv(referenceWhite);

	return new Luv([
		l,
		13 * l * (tempU - referenceU),
		13 * l * (tempV - referenceV),
	], newIlluminant);
};

const turn = 2 * Math.PI;

const luvToLchUv = (luv: Luv) => new LchUv([
	luv.l,
	Math.hypot(luv.u, luv.v),
	mod(Math.atan2(luv.v, luv.u) / turn, 1), // radians to [0, 1)
], luv.illuminant);

const lchUvToLuv = (lch: LchUv) => new Luv([
	lch.l,
	Math.cos(lch.h * turn) * lch.c,
	Math.sin(lch.h * turn) * lch.c,
], lch.illuminant);
//#endregion