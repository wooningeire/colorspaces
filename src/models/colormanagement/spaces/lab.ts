import {Vec3, mod, Color} from "@/util";

import {Col, Xyz, Xy, adaptXyz, xyyToXyzNoAdapt} from "./col-xyz-xyy-illuminants";


//#region Types
export class Lab extends Col {
  // static readonly labels = ["L*", "a*", "b*"];

  constructor(data: Vec3, newIlluminant: Xy) {
    super(data, newIlluminant);
  }

  static fromXyz(xyz: Xyz): Lab {
    return xyzToLab(xyz, xyz.illuminant);
  }

  toXyz(newIlluminant: Xy=this.illuminant): Xyz {
    return labToXyz(this, newIlluminant);
  }

  get l() { return this[0]; }
  get a() { return this[1]; }
  get b() { return this[2]; }
}

export class LchAb extends Col {
  // static readonly labels = ["L*", "C*", "h"];

  constructor(data: Vec3, newIlluminant: Xy) {
    super(data, newIlluminant);
  }

  static fromXyz(xyz: Xyz): LchAb {
    return labToLchAb(xyzToLab(xyz, xyz.illuminant));
  }

  toXyz(newIlluminant: Xy=this.illuminant): Xyz {
    return labToXyz(lchAbToLab(this), newIlluminant);
  }

  get l() { return this[0]; }
  get c() { return this[1]; }
  get h() { return this[2]; }
}
//#endregion

//#region Conversion functions// https://en.wikipedia.org/wiki/CIELAB_color_space#From_CIELAB_to_CIEXYZ
const labToXyz = (lab: Lab, newIlluminant: Xy) => {
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
    compHelper(tempX) * referenceWhiteXyz.x,
    compHelper(tempY) * referenceWhiteXyz.y,
    compHelper(tempZ) * referenceWhiteXyz.z,
  ], lab.illuminant), newIlluminant);
};

const xyzToLab = (xyz: Xyz, newIlluminant: Xy) => {
  const adaptedXyz = adaptXyz(xyz, newIlluminant);
  const referenceWhiteXyz = xyyToXyzNoAdapt(newIlluminant);

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
  ], newIlluminant);
};

const turn = 2 * Math.PI;

const labToLchAb = (lab: Lab) => new LchAb([
  lab.l,
  Math.hypot(lab.a, lab.b),
  mod(Math.atan2(lab.b, lab.a) / turn, 1), // radians to [0, 1)
], lab.illuminant);

const lchAbToLab = (lch: LchAb) => new Lab([
  lch.l,
  Math.cos(lch.h * turn) * lch.c,
  Math.sin(lch.h * turn) * lch.c,
], lch.illuminant);
//#endregion