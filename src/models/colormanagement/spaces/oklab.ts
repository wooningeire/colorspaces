import {Vec3, mod, Color} from "@/util";

import {Col, Xyz, Xy, adaptXyz, xyyToXyzNoAdapt, illuminantsXy} from "./col-xyz-xyy-illuminants";
import * as math from "mathjs";

const d65 = illuminantsXy["2deg"]["D65"];

//#region Types
export class Oklab extends Col {
  // static readonly labels = ["L*", "a*", "b*"];

    static readonly defaultIlluminant = d65;

  constructor(data: Vec3) {
    super(data);
  }

  static fromXyz(xyz: Xyz): Oklab {
    return xyzToOklab(xyz);
  }

  toXyz(newIlluminant: Xy=this.illuminant): Xyz {
    return oklabToXyz(this, newIlluminant);
  }

  get l() { return this[0]; }
  get a() { return this[1]; }
  get b() { return this[2]; }
}

export class OklchAb extends Col {
  // static readonly labels = ["L*", "C*", "h"];

    static readonly defaultIlluminant = d65;

  constructor(data: Vec3) {
    super(data);
  }

  static fromXyz(xyz: Xyz): OklchAb {
    return oklabToOklchAb(xyzToOklab(xyz));
  }

  toXyz(newIlluminant: Xy=this.illuminant): Xyz {
    return oklabToXyz(oklchAbToOklab(this), newIlluminant);
  }

  get l() { return this[0]; }
  get c() { return this[1]; }
  get h() { return this[2]; }
}
//#endregion

//#region Conversion functions// https://bottosson.github.io/posts/oklab/
const xyzToLmsMat = [
  [0.8189330101, 0.3618667424, -0.1288597137],
  [0.0329845436, 0.9293118715,  0.0361456387],
  [0.0482003018, 0.2643662691,  0.6338517070],
];
const lmsNonlinearToOklabMat = [
  [0.2104542553,  0.7936177850, -0.0040720468],
  [1.9779984951, -2.4285922050,  0.4505937099],
  [0.0259040371,  0.7827717662, -0.8086757660],
];

const oklabToXyz = (lab: Oklab, newIlluminant: Xy) => {
  const lmsNonlinear = math.multiply(math.inv(lmsNonlinearToOklabMat), lab).flat();
  const lms = lmsNonlinear.map(comp => comp ** 3);

  const xyzD65 = math.multiply(math.inv(xyzToLmsMat), lms).flat() as Vec3;
  return adaptXyz(new Xyz(xyzD65, d65), newIlluminant);
};

const xyzToOklab = (xyz: Xyz) => {
  const adaptedXyz = adaptXyz(xyz, d65);

  const lms = math.multiply(xyzToLmsMat, adaptedXyz).flat();
  const lmsNonlinear = lms.map(comp => comp ** (1/3));

  const oklab = math.multiply(lmsNonlinearToOklabMat, lmsNonlinear).flat();
  return new Oklab(oklab as Vec3);
};

const turn = 2 * Math.PI;

const oklabToOklchAb = (lab: Oklab) => new OklchAb([
  lab.l,
  Math.hypot(lab.a, lab.b),
  mod(Math.atan2(lab.b, lab.a) / turn, 1), // radians to [0, 1)
]);

const oklchAbToOklab = (lch: OklchAb) => new Oklab([
  lch.l,
  Math.cos(lch.h * turn) * lch.c,
  Math.sin(lch.h * turn) * lch.c,
]);
//#endregion