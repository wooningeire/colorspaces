import { Vec3, mod } from "$/util";

import { Col, Xyz, Xy, adaptXyz, xyyToXyzNoAdapt } from "./col-xyz-xyy-illuminants";


//#region Types
export class Cielab extends Col {
  // static readonly labels = ["L*", "a*", "b*"];

  constructor(data: Vec3, newIlluminant: Xy) {
    super(data, newIlluminant);
  }

  static fromXyz(xyz: Xyz): Cielab {
    return xyzToCielab(xyz, xyz.illuminant);
  }

  toXyz(newIlluminant: Xy=this.illuminant): Xyz {
    return cielabToXyz(this, newIlluminant);
  }

  get l() { return this[0]; }
  get a() { return this[1]; }
  get b() { return this[2]; }
}
//#endregion

//#region Conversion functions// https://en.wikipedia.org/wiki/CIELAB_color_space#From_CIELAB_to_CIEXYZ
const cielabToXyz = (lab: Cielab, newIlluminant: Xy) => {
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

const xyzToCielab = (xyz: Xyz, newIlluminant: Xy) => {
  const adaptedXyz = adaptXyz(xyz, newIlluminant);
  const referenceWhiteXyz = xyyToXyzNoAdapt(newIlluminant);

  const tempXyz = adaptedXyz.map((comp, i) => adaptedXyz[i] / referenceWhiteXyz[i]);

  const compHelper = (comp: number) =>
      comp > (6/29)**3
          ? comp**(1/3)
          : comp / (3 * (6/29)**2) + 4/29;

  const newXyz = tempXyz.map(compHelper);

  return new Cielab([
    116 * newXyz[1] - 16,
    500 * (newXyz[0] - newXyz[1]),
    200 * (newXyz[1] - newXyz[2]),
  ], newIlluminant);
};

const turn = 2 * Math.PI;

export const lxyToLch = (lxy: Vec3): Vec3 => [
  lxy[0],
  Math.hypot(lxy[1], lxy[2]),
  mod(Math.atan2(lxy[2], lxy[1]) / turn, 1), // radians to [0, 1)
];

export const lchToLxy = (lch: Vec3): Vec3 => [
  lch[0],
  Math.cos(lch[2] * turn) * lch[1],
  Math.sin(lch[2] * turn) * lch[1],
];
//#endregion

//#region WebGL conversion functions
export const webglLabDeclarations = `float xyzToLabCompHelper(float comp) {
  return comp > (6./29.) * (6./29.) * (6./29.)
      ? pow(comp, 1./3.)
      : comp / (3. * (6./29.) * (6./29.)) + 4./29.;
}
vec3 xyzToCielab(vec3 xyz, vec2 originalIlluminant, vec2 newIlluminant) {
  vec3 adaptedXyz = adaptXyz(xyz, originalIlluminant, newIlluminant);
  vec3 referenceWhiteXyz = xyyToXyz(vec3(newIlluminant, 1.));

  vec3 tempXyz = adaptedXyz / referenceWhiteXyz;
  vec3 newXyz = vec3(
    xyzToLabCompHelper(tempXyz.x),
    xyzToLabCompHelper(tempXyz.y),
    xyzToLabCompHelper(tempXyz.z)
  );

  return vec3(
    116. * newXyz.y - 16.,
    500. * (newXyz.x - newXyz.y),
    200. * (newXyz.y - newXyz.z)
  );
}

float labToXyzCompHelper(float comp) {
  return comp > 6./29.
      ? comp * comp * comp
      : 3. * (6./29.) * (6./29.) * (comp - 4./29.);
}
vec3 cielabToXyz(vec3 lab, vec2 originalIlluminant, vec2 newIlluminant) {
    float tempY = (lab.x + 16.) / 116.;
    float tempX = tempY + lab.y / 500.;
    float tempZ = tempY - lab.z / 200.;
  
    vec3 referenceWhiteXyz = xyyToXyz(vec3(originalIlluminant, 1.));
  
    return adaptXyz(vec3(
      labToXyzCompHelper(tempX) * referenceWhiteXyz.x,
      labToXyzCompHelper(tempY) * referenceWhiteXyz.y,
      labToXyzCompHelper(tempZ) * referenceWhiteXyz.z
    ), originalIlluminant, newIlluminant);
}

vec3 lxyToLch(vec3 lxy) {
  return vec3(
    lxy.x,
    sqrt(lxy.y * lxy.y + lxy.z * lxy.z),
    atan(lxy.z, lxy.y) / REV
  );
}

vec3 lchToLxy(vec3 lch) {
  return vec3(
    lch.x,
    cos(lch.z * REV) * lch.y,
    sin(lch.z * REV) * lch.y
  );
}`;
//#endregion