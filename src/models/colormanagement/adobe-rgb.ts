import * as math from "mathjs";

import {Vec3} from "@/util";

import {Col, Xyz, Xy, illuminantsXy, chromaticAdaptationMat, adaptXyz, xyyToXyzNoAdapt, chromaticAdaptationTransforms} from "./col-xyz-xyy-illuminants";


//#region Types
export class AdobeRgb extends Col {
	static readonly labels = ["R", "G", "B"];
	
	static readonly defaultIlluminant = illuminantsXy["2deg"]["D65"];

	constructor(data: Vec3) {
		super(data, illuminantsXy["2deg"]["D65"]);
	}

	static from(dataOrCol: Vec3 | Col): AdobeRgb {
		if (dataOrCol instanceof LinearAdobeRgb) {
			return linToGammaAdobeRgb(dataOrCol);
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
//#endregion

//#region Conversion functions
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
//#endregion