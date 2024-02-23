import * as math from "mathjs";

import {Vec3} from "@/util";

import {Col, Xyz, Xy, illuminantsXy, chromaticAdaptationMat, adaptXyz, xyyToXyzNoAdapt, chromaticAdaptationTransforms} from "./col-xyz-xyy-illuminants";


const isZeroToOne = (col: Col) => col.every(comp => 0 <= comp && comp <= 1);

//#region Types
export class AdobeRgb extends Col {
  // static readonly labels = ["R", "G", "B"];
  
  static readonly defaultIlluminant = illuminantsXy["2deg"]["D65"];

  constructor(data: Vec3) {
    super(data, new.target.defaultIlluminant);
  }

  static fromCol(col: Col) {
    if (col instanceof LinearAdobeRgb) {
      return linToGammaAdobeRgb(col);
    } else if (col instanceof AdobeRgb) {
      return new AdobeRgb(col as any as Vec3);
    }
    return super.fromCol(col, this.defaultIlluminant);
  }

  static fromXyz(xyz: Xyz): AdobeRgb {
    return linToGammaAdobeRgb(xyzToLinAdobeRgb(xyz));
  }

  toXyz(newIlluminant: Xy=this.illuminant) {
    return linAdobeRgbToXyz(gammaToLinAdobeRgb(this), newIlluminant);
  }

  inGamut(): boolean {
    return isZeroToOne(this);
  }
}

export class LinearAdobeRgb extends Col {
  // static readonly labels = ["R", "G", "B"];
  
  static readonly defaultIlluminant = illuminantsXy["2deg"]["D65"];

  constructor(data: Vec3) {
    super(data, new.target.defaultIlluminant);
  }

  static fromCol(col: Col) {
    return col instanceof AdobeRgb
        ? gammaToLinAdobeRgb(col)
        : super.fromCol(col, this.defaultIlluminant);
  }

  static fromXyz(xyz: Xyz): LinearAdobeRgb {
    return xyzToLinAdobeRgb(xyz);
  }

  toXyz(newIlluminant: Xy=this.illuminant) {
    return linAdobeRgbToXyz(this, newIlluminant);
  }

  inGamut(): boolean {
    return isZeroToOne(this);
  }
}
//#endregion

//#region Conversion functions
const xyzToLinAdobeRgb = (xyz: Xyz) => {
  const adaptedXyz = adaptXyz(xyz, illuminantsXy["2deg"]["D65"]);

  //http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
  const mat = math.multiply([
    [+2.0413690, -0.5649464, -0.3446944],
    [-0.9692660, +1.8760108, +0.0415560],
    [+0.0134474, -0.1183897, +1.0154096],
  ], adaptedXyz);

  return new LinearAdobeRgb(mat as any as Vec3);
};

const linAdobeRgbToXyz = (linAdobe: LinearAdobeRgb, newIlluminant: Xy) => {
  //http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
  const mat = math.multiply([
    [+0.5767309, +0.1855540, +0.1881852],
    [+0.2973769, +0.6273491, +0.0752741],
    [+0.0270343, +0.0706872, +0.9911085],
  ], linAdobe);

  return adaptXyz(new Xyz(mat as any as Vec3, linAdobe.illuminant), newIlluminant);
};

// https://www.adobe.com/digitalimag/pdfs/AdobeRGB1998.pdf sec 4.3.1.2
const linCompToGammaAdobeRgb = (comp: number) => comp**(1 / (2 + 51/256));
const gammaCompToLinAdobeRgb = (comp: number) => comp**(2 + 51/256);

const linToGammaAdobeRgb = (linear: LinearAdobeRgb) => new AdobeRgb(linear.map(linCompToGammaAdobeRgb) as Vec3);
const gammaToLinAdobeRgb = (adobe: AdobeRgb) => new LinearAdobeRgb(adobe.map(gammaCompToLinAdobeRgb) as Vec3);
//#endregion

//#region WebGL conversion functions
export const webglAdobeRgbDeclarations = `vec3 xyzToLinAdobeRgb(vec3 xyz, vec2 originalIlluminant) {
  vec3 adaptedXyz = adaptXyz(xyz, originalIlluminant, illuminant2_D65);

  return transpose(mat3(
    +2.0413690, -0.5649464, -0.3446944,
    -0.9692660, +1.8760108, +0.0415560,
    +0.0134474, -0.1183897, +1.0154096
  )) * adaptedXyz;
}

const float gammaToLinAdobeRgbExp = 2. + 51./256.;
const float linToGammaAdobeRgbExp = 1. / gammaToLinAdobeRgbExp;
vec3 linToGammaAdobeRgb(vec3 rgb) {
  return vec3(
    pow(rgb.r, linToGammaAdobeRgbExp),
    pow(rgb.g, linToGammaAdobeRgbExp),
    pow(rgb.b, linToGammaAdobeRgbExp)
  );
}

vec3 linAdobeRgbToXyz(vec3 rgb, vec2 newIlluminant) {
  vec3 xyz = transpose(mat3(
    +2.0413690, -0.5649464, -0.3446944,
    -0.9692660, +1.8760108, +0.0415560,
    +0.0134474, -0.1183897, +1.0154096
  )) * rgb;
  
  return adaptXyz(xyz, illuminant2_D65, newIlluminant);
}

vec3 gammaToLinAdobeRgb(vec3 rgb) {
  return vec3(
    pow(rgb.r, gammaToLinAdobeRgbExp),
    pow(rgb.g, gammaToLinAdobeRgbExp),
    pow(rgb.b, gammaToLinAdobeRgbExp)
  );
}`;
//#endregion