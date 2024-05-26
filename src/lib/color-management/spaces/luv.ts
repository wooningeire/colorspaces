import {Vec3, mod} from "$/util";

import {Col, Xyz, Xy, adaptXyz, xyyToXyzNoAdapt} from "./col-xyz-xyy-illuminants";


//#region Types
export class Cieluv extends Col {
  // static readonly labels = ["L*", "u*", "v*"];

  constructor(data: Vec3, newIlluminant: Xy) {
    super(data, newIlluminant);
  }

  static fromXyz(xyz: Xyz): Cieluv {
    return xyzToCieluv(xyz, xyz.illuminant);
  }

  toXyz(newIlluminant: Xy=this.illuminant): Xyz {
    return cieluvToXyz(this, newIlluminant);
  }

  get l() { return this[0]; }
  get u() { return this[1]; }
  get v() { return this[2]; }
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

const cieluvToXyz = (luv: Cieluv, newIlluminant: Xy) => {
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

const xyzToCieluv = (xyz: Xyz, newIlluminant: Xy) => {
  const adaptedXyz = adaptXyz(xyz, newIlluminant);
  const referenceWhite = xyyToXyzNoAdapt(newIlluminant);

  const relativeLum = adaptedXyz.y / referenceWhite.y;

  const l =
      relativeLum > (6/29)**3
          ? relativeLum**(1/3) * 116 - 16
          : relativeLum * (29/3)**3;

  const [tempU, tempV] = uv(adaptedXyz);
  const [referenceU, referenceV] = uv(referenceWhite);

  return new Cieluv([
    l,
    13 * l * (tempU - referenceU),
    13 * l * (tempV - referenceV),
  ], newIlluminant);
};
//#endregion

//#region WebGL conversion functions
export const webglLuvDeclarations = `vec2 luvUvHelper(vec3 xyz) {
  float denominator = xyz.x + (15. * xyz.y) + (3. * xyz.z);

  return vec2(
    4. * xyz.x / denominator,
    9. * xyz.y / denominator
  );
}

vec3 xyzToCieluv(vec3 xyz, vec2 originalIlluminant, vec2 newIlluminant) {
  vec3 adaptedXyz = adaptXyz(xyz, originalIlluminant, newIlluminant);
  vec3 referenceWhiteXyz = xyyToXyz(vec3(newIlluminant, 1.));

  float relativeLum = adaptedXyz.y / referenceWhiteXyz.y;

  float l =
      relativeLum > (6./29.) * (6./29.) * (6./29.)
          ? pow(relativeLum, 1./3.) * 116. - 16.
          : relativeLum * (29./3.) * (29./3.) * (29./3.);

  vec2 tempUv = luvUvHelper(adaptedXyz);
  vec2 referenceUv = luvUvHelper(referenceWhiteXyz);

  return vec3(
    l,
    13. * l * (tempUv.x - referenceUv.x),
    13. * l * (tempUv.y - referenceUv.y)
  );
}
vec3 cieluvToXyz(vec3 luv, vec2 originalIlluminant, vec2 newIlluminant) {
  float tempY = (luv.x + 16.) / 116.;

  float y = 
      tempY > 6./29.
          ? tempY * tempY * tempY
          : 3. * (6./29.) * (6./29.) * (tempY - 4./29.);

  vec3 referenceWhiteXyz = xyyToXyz(vec3(originalIlluminant, 1.));
  vec2 referenceUv = luvUvHelper(referenceWhiteXyz);

  float tempU = luv.y / (13. * luv.x) + referenceUv.x;
  float tempV = luv.z / (13. * luv.x) + referenceUv.y;
  
  float x = -9. * y * tempU / ((tempU - 4.) * tempV - tempU * tempV);
  float z = (9. * y - (15. * tempV * y) - (tempV * x)) / (3. * tempV);

  return adaptXyz(vec3(x, y, z), originalIlluminant, newIlluminant);
}`;
//#endregion