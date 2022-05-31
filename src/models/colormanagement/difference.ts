import {mod, Vec3} from "@/util";

import {Col, Xyz} from "./spaces/col-xyz-xyy-illuminants";
import {Lab, LchAb} from "./spaces/lab";

export const deltaE1976 = (col1: Vec3 | Col, col2: Vec3 | Col) => {
	const lab1 = Lab.from(col1) as Lab;
	const lab2 = Lab.from(col2, col1 instanceof Col ? col1.illuminant : undefined) as Lab;

	return Math.hypot(...lab1.map((comp, i) => lab2[i] - lab1[i]));
};

const turn = 2 * Math.PI;
const deg = (deg: number) => deg * Math.PI / 180;
const elseNan = (value: number, fallback: number) => isNaN(value) ? fallback : value;

export const deltaE2000 = (col1: Vec3 | Col, col2: Vec3 | Col, kL=1, kC=1, kH=1) => {
	const lab1 = Lab.from(col1) as Lab;
	const lab2 = Lab.from(col2, col1 instanceof Col ? col1.illuminant : undefined) as Lab;

	const lch1 = LchAb.from(lab1) as LchAb;
	const lch2 = LchAb.from(lab2) as LchAb;

	const lAdjDiff = lch2.l - lch1.l;

	const lAvg = (lch1.l + lch2.l) / 2;
	const cAvg = (lch1.c + lch2.c) / 2;

	const cAvgPow7 = cAvg**7;
	const aAdjustment = Math.sqrt(cAvgPow7 / (cAvgPow7 + 25**7));

	const aAdj1 = lab1.a * (3 - aAdjustment) / 2;
	const aAdj2 = lab2.a * (3 - aAdjustment) / 2;

	const cAdj1 = Math.hypot(aAdj1, lab1.b);
	const cAdj2 = Math.hypot(aAdj2, lab2.b);
	const cAdjAvg = (cAdj1 + cAdj2) / 2;
	const cAdjDiff = cAdj2 - cAdj1;

	const hAdj1 = mod(elseNan(Math.atan2(lab1.b, aAdj1), 0), turn);
	const hAdj2 = mod(elseNan(Math.atan2(lab2.b, aAdj2), 0), turn);

	const hAdjDiff = Math.abs(hAdj1 - hAdj2);
	const hAdjAvg = cAdj1 === 0 || cAdj2 === 0 ? hAdj1 + hAdj2 : (hAdj1 + hAdj2) / 2;

	const hAdjDiffChroma = 2 * Math.sqrt(cAdj1 * cAdj2) * Math.sin(hAdjDiff / 2);

	const t = 1
			- 0.17 * Math.cos(hAdjAvg - deg(30))
			+ 0.24 * Math.cos(2 * hAdjAvg)
			+ 0.32 * Math.cos(3 * hAdjAvg + deg(6))
			- 0.20 * Math.cos(4 * hAdjAvg - deg(63));

	const lCompensation = 1 + (0.015 * (lAvg - 50)**2) / Math.sqrt(20 + (lAvg - 50)**2);
	const cCompensation = 1 + 0.045 * cAdjAvg;
	const hCompensation = 1 + 0.015 * cAdjAvg * t;

	const cAdjAvgPow7 = cAdjAvg**7;
	const hueRot = -2 * Math.sqrt(cAdjAvgPow7 / (cAdjAvgPow7 + 25**7))
			* Math.sin(turn/6 * Math.exp(-1 * ((hAdjAvg*180/Math.PI - 275) / 25)**2));

	const lFinalDiff = lAdjDiff / kL / lCompensation;
	const cFinalDiff = cAdjDiff / kC / cCompensation;
	const hFinalDiff = hAdjDiffChroma / kH / hCompensation;

	return Math.sqrt(
		lFinalDiff**2
		+ cFinalDiff**2
		+ hFinalDiff**2
		+ hueRot * cFinalDiff * hFinalDiff
	);
};

// https://www.w3.org/TR/WCAG20/#contrast-ratiodef
export const contrastRatio = (col1: Vec3 | Col, col2: Vec3 | Col) => {
	const xyz1 = Xyz.from(col1);
	const xyz2 = Xyz.from(col2, col1 instanceof Col ? col1.illuminant : undefined);

	return (xyz1.y + 0.05) / (xyz2.y + 0.05);
};