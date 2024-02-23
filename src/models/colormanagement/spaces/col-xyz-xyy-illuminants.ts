import * as math from "mathjs";

import {Vec2, Vec3} from "@/util";

/**
 * Represents a color in an absolute color space.
 * Subclasses should implement the methods `static from`, `static fromXyz`, and `toXyz`.
 */
//@ts-ignore
export class Col extends Array {
  static readonly [Symbol.species] = Array;
  // static readonly labels: string[] = [];
  // static readonly isRgb: boolean = false;

  static readonly defaultIlluminant: Xy = null!; //illuminantE; // set later

  constructor(
    /* readonly */ data: number[],
    readonly illuminant: Xy=new.target.defaultIlluminant,
  ) {
    super();
    this.push(...data);
    // Object.freeze(this);
  }

  /**
   * Converts a general color to this color type.
   * @param dataOrCol A color or vector to convert from.
   * @param newIlluminant The result illuminant of the color; if `dataOrCol` is a `Col`, then its illuminant, otherwise the color's default illuminant
   * @returns A color of this type.
   */
  static from(dataOrCol: Vec3 | Col, newIlluminant: Xy=dataOrCol instanceof Col ? dataOrCol.illuminant : this.defaultIlluminant) {
    if (dataOrCol instanceof Col) {
      return this.fromCol(dataOrCol, newIlluminant);
    } else {
      return new this(dataOrCol, newIlluminant);
    }
  }

  static fromCol(col: Col, newIlluminant: Xy=col.illuminant) {
    return this.fromXyz(col.toXyz(newIlluminant));
  }

  static fromXyz(xyz: Xyz): Col {
    throw new TypeError("Abstract method / not implemented");
  }

  toXyz(newIlluminant: Xy=this.illuminant): Xyz {
    throw new TypeError("Abstract method / not implemented");
  }

  inGamut(): boolean {
    return true;
  }
}

//#region Types
export class Xyz extends Col {
  // static readonly labels = ["X", "Y", "Z"];

  constructor(data: Vec3, newIlluminant: Xy=illuminantE) {
    if (data.length !== 3) throw new TypeError("Data must have 3 components");

    super(data, newIlluminant);
  }

  static fromCol(col: Col, newIlluminant: Xy=col.illuminant): Xyz {
    return col.toXyz(newIlluminant);
  }

  static fromXyz(xyz: Xyz): Xyz {
    return new Xyz(xyz as any as Vec3, xyz.illuminant);
  }

  toXyz(newIlluminant: Xy=this.illuminant) {
    return adaptXyz(this, newIlluminant);
  }

  get x() { return this[0]; }
  get y() { return this[1]; }
  get z() { return this[2]; }
}

export class Xyy extends Col {
  // static readonly labels = ["x", "y", "Y"];

  constructor(data: Vec3, newIlluminant: Xy=illuminantE) {
    super(data, newIlluminant);
  }

  static fromXyz(xyz: Xyz): Xyy {
    return xyzToXyy(xyz, xyz.illuminant);
  }

  toXyz(newIlluminant: Xy=this.illuminant): Xyz {
    return xyyToXyz(this, newIlluminant);
  }

  get x() { return this[0]; }
  get y() { return this[1]; }
  get lum() { return this[2]; }
}

export class Xy extends Col {
  constructor(data: Vec2, newIlluminant: Xy=illuminantE) {
    super(data, newIlluminant);
  }

  toXyz(newIlluminant: Xy=this.illuminant): Xyz {
    return xyyToXyz(this, newIlluminant);
  }

  get x() { return this[0]; }
  get y() { return this[1]; }
}
//#endregion

//#region Illuminants
export const illuminantE = new Xy([1/3, 1/3], null as any as Xy);
Object.assign(illuminantE, {illuminant: illuminantE});
Object.assign(Col, {defaultIlluminant: illuminantE});

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

/** Converts an xyY color to XYZ without changing the illuminant */
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

//#region WebGL conversion functions
export const webglXyzDeclarations = `const mat3 bradford = transpose(mat3(
   0.8951,  0.2664, -0.1614,
  -0.7502,  1.7135,  0.0367,
   0.0389, -0.0685,  1.0296
));

const vec2 illuminant2_D65 = vec2(0.31270, 0.32900);
const vec2 illuminant2_E = vec2(1./3., 1./3.);


vec3 xyyToXyz(vec3 xyy) {
  float x = xyy.x;
  float y = xyy.y;
  float lum = xyy.z;

  return y == 0.
      ? vec3(0., 0., 0.)
      : vec3(
        lum / y * x,
        lum,
        lum / y * (1. - x - y)
      );
}
vec3 xyzToXyy(vec3 xyz){
  float x = xyz.x;
  float y = xyz.y;
  float z = xyz.z;

  float dot1 = x + y + z;

  return dot1 == 0.
      ? vec3(0., 0., 0.)
      : vec3(
        x / dot1,
        y / dot1,
        y
      );
}

mat3 chromaticAdaptationMatrix(vec3 testWhiteXyz, vec3 refWhiteXyz, mat3 adaptationMatrix) {
  vec3 newTestWhiteXyz = adaptationMatrix * testWhiteXyz;
  vec3 newRefWhiteXyz = adaptationMatrix * refWhiteXyz;

  vec3 dotDivision = newRefWhiteXyz / newTestWhiteXyz;

  mat3 scalarMatrix = mat3(
    dotDivision.x, 0., 0.,
    0., dotDivision.y, 0.,
    0., 0., dotDivision.z
  );

  mat3 adaptationShifterMatrix = inverse(adaptationMatrix) * scalarMatrix;
  return adaptationShifterMatrix * adaptationMatrix;
}

vec3 adaptXyz(vec3 origXyz, vec2 originalIlluminant, vec2 targetIlluminant) {
  vec3 testWhiteXyz = xyyToXyz(vec3(originalIlluminant, 1.));
  vec3 refWhiteXyz = xyyToXyz(vec3(targetIlluminant, 1.));

  return chromaticAdaptationMatrix(testWhiteXyz, refWhiteXyz, bradford) * origXyz;
}

vec3 xyzToLinearSrgb(vec3 xyz, vec2 originalIlluminant) {
  vec3 adaptedXyz = adaptXyz(xyz, originalIlluminant, illuminant2_D65);

  //https://en.wikipedia.org/wiki/SRGB#From_CIE_XYZ_to_sRGB
  return transpose(mat3(
    +3.2404542, -1.5371385, -0.4985314,
    -0.9692660, +1.8760108, +0.0415560,
    +0.0556434, -0.2040259, +1.0572252
  )) * adaptedXyz;
}

vec3 linearSrgbToXyz(vec3 rgb, vec2 newIlluminant) {
  vec3 xyz = inverse(transpose(mat3(
    +3.2404542, -1.5371385, -0.4985314,
    -0.9692660, +1.8760108, +0.0415560,
    +0.0556434, -0.2040259, +1.0572252
  ))) * rgb;

  return adaptXyz(xyz, illuminant2_D65, newIlluminant);
}`;
//#endregion