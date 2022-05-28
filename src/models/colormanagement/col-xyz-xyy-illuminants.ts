import * as math from "mathjs";

import {Vec2, Vec3} from "@/util";

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

//#region Types
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

	get x() { return this[0]; }
	get y() { return this[1]; }
	get z() { return this[2]; }
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

	get x() { return this[0]; }
	get y() { return this[1]; }
	get lum() { return this[2]; }
}

export class Xy extends Col {
	constructor(data: Vec2, illuminant: Xy=illuminantE) {
		super(data, illuminant);
	}

	toXyz(illuminant: Xy=this.illuminant): Xyz {
		return xyyToXyz(this, illuminant);
	}

	get x() { return this[0]; }
	get y() { return this[1]; }
}
//#endregion

//#region Illuminants
export const illuminantE = new Xy([1/3, 1/3], null as any as Xy);
Object.assign(illuminantE, {illuminant: illuminantE});

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


// https://www.mathworks.com/help/images/ref/whitepoint.html
const illuminantsXyz = <{
	[standard: string]: {
		[illuminant: string]: Vec3,
	},
}>{
	"2deg": {
		"ICC": [31595, 32768, 27030].map(comp => comp / 32768) as Vec3,
		"D50": [0.9642956764295677, 1, 0.8251046025104602],
		"D65": [0.9504559270516716, 1, 1.0890577507598784],//[0.9504, 1, 1.0888] as Color,
		"E": [1, 1, 1],
	},

	"10deg": {

	},
};
//#endregion

//#region Chromatic adaptation
/**
 * From https://github.com/colour-science/colour/blob/develop/colour/adaptation/
 */
export const chromaticAdaptationTransforms = {
	"Bradford": [
		[ 0.8951,  0.2664, -0.1614],
		[-0.7502,  1.7135,  0.0367],
		[ 0.0389, -0.0685,  1.0296],
	],
};

/**
 * Adapted from https://github.com/colour-science/colour/blob/develop/colour/adaptation/vonkries.py#L44
 */
export const chromaticAdaptationMat = (testWhiteXyz: Xyz, refWhiteXyz: Xyz, adaptationMatrix: number[][]) => {
	const newTestWhiteXyz = math.multiply(adaptationMatrix, testWhiteXyz);
	const newRefWhiteXyz = math.multiply(adaptationMatrix, refWhiteXyz);

	const scalarMatrix = math.diag(math.dotDivide(newRefWhiteXyz, newTestWhiteXyz) as math.MathCollection);

	const adaptationShifterMatrix = math.multiply(math.inv(adaptationMatrix), scalarMatrix);
	return math.multiply(adaptationShifterMatrix, adaptationMatrix);
};

export const adaptXyz = (origColor: Xyz, targetIlluminant: Xy): Xyz => new Xyz(math.multiply(
	chromaticAdaptationMat(
		xyyToXyzNoAdapt(origColor.illuminant),
		xyyToXyzNoAdapt(targetIlluminant),
		chromaticAdaptationTransforms["Bradford"],
	),
	origColor,
) as any as Vec3, targetIlluminant);
//#endregion

//#region Conversion functions
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

export const xyyToXyzNoAdapt = (xyy: Xy | Xyy) => {
	const [x, y, lum=1] = xyy;
	
	return y === 0
			? new Xyz([0, 0, 0], xyy.illuminant)
			: new Xyz([
				lum / y * x,
				lum,
				lum / y * (1 - x - y),
			], xyy.illuminant);
};
//#endregion