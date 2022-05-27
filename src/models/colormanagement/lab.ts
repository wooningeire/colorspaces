import {Vec3} from "@/util";

import {Col, Xyz, Xy, adaptXyz, xyyToXyzNoAdapt} from "./col-xyz-xyy-illuminants";


//#region Types
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

//#region Conversion functions// https://en.wikipedia.org/wiki/CIELAB_color_space#From_CIELAB_to_CIEXYZ
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
//#endregion