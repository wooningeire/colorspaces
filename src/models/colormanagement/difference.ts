import {Vec3} from "@/util";

import {Col} from "./col-xyz-xyy-illuminants";
import {Lab, LchAb} from "./lab";

export const deltaE1976 = (col1: Vec3 | Col, col2: Vec3 | Col) => {
	const lab1 = Lab.from(col1);
	const lab2 = Lab.from(col2);

	return Math.hypot(...lab1.map((comp, i) => lab2[i] - lab1[i]));
};

export const deltaE2000 = (col1: Vec3 | Col, col2: Vec3 | Col) => {
	const lch1 = LchAb.from(col1);
	const lch2 = LchAb.from(col2);

	const lDiff = lch2.l - lch1.l;

	const lAvg = (lch1.l + lch2.l) / 2;
	const cAvg = (lch1.c + lch2.c) / 2;
};