import { Node, OutSocket } from "@/models/Node";

const prelude = `const mat3 bradford = transpose(mat3(
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
}

/** Transfer function as defined by https://www.w3.org/Graphics/Color/srgb
 * 
 *  More precise constants as specified in https://en.wikipedia.org/wiki/SRGB
 */
float linearCompToGammaSrgb(float comp) {
  return comp <= 0.0031308
      ? 12.9232102 * comp
      : 1.055 * pow(comp, 1./2.4) - 0.055;
}
float gammaCompToLinearSrgb(float comp) {
  return comp <= 0.04045
      ? comp / 12.9232102
      : pow((comp + 0.055) / 1.055, 2.4);
}

vec3 linearToGammaSrgb(vec3 linear) {
  return vec3(
    linearCompToGammaSrgb(linear.r),
    linearCompToGammaSrgb(linear.g),
    linearCompToGammaSrgb(linear.b)
  );
}

vec3 gammaToLinearSrgb(vec3 linear) {
  return vec3(
    gammaCompToLinearSrgb(linear.r),
    gammaCompToLinearSrgb(linear.g),
    gammaCompToLinearSrgb(linear.b)
  );
}

vec3 xyzToGammaSrgb(vec3 xyz, vec2 originalIlluminant) {
  return linearToGammaSrgb(xyzToLinearSrgb(xyz, originalIlluminant));
}
vec3 gammaSrgbToXyz(vec3 rgb, vec2 newIlluminant) {
  return linearSrgbToXyz(gammaToLinearSrgb(rgb), newIlluminant);
}
`;

export class WebglModule {
  constructor(
    private readonly template: string,
    private readonly dependencies: WebglModule[] = [],
  ) {}
}

export class WebglVariables {
  static readonly FRAGMENT = new WebglVariables(`#version 300 es

precision mediump float;

in vec2 v_uv;
out vec4 fragColor;

uniform float alphaFac;
uniform bool detectGamut;

const float LUM = 1.;

${prelude}

void main() {
  {main}
  
  vec3 gammaSrgb = xyzToGammaSrgb({xyz}, illuminant2_D65);

  bool outOfGamut = 0. > gammaSrgb.r
      || 0. > gammaSrgb.g
      || 0. > gammaSrgb.b;

  float alpha = detectGamut && outOfGamut
      ? 0.75
      : 1.;

  fragColor = vec4(gammaSrgb, 1.);
}`,
    {},
  );

  constructor(
    private readonly template: string,
    private readonly outVariables: Record<string, string>,
    private readonly slots: string[]=[],
    private readonly dependencies: WebglModule[]=[],
  ) {}


  fillSlots(mappings: Record<string, string>) {
    const outVariables: Record<string, string> = {...this.outVariables};
    let template = this.template;
    for (const [mappingName, mappingValue] of Object.entries(mappings)) {
      template = template.replaceAll(
        new RegExp(`{${mappingName}(:\\w+)?}`, "g"),
        mappingValue,
      );
      for (const [name, value] of Object.entries(outVariables)) {
        outVariables[name] = value.replaceAll(
          new RegExp(`{${mappingName}(:\\w+)?}`, "g"),
          mappingValue,
        );
      }
    }

    return new WebglVariables(template, outVariables);
  }

  follow(source: WebglVariables, sourceVariableSlotMapping: Record<string, string>) {
    const outVariables: Record<string, string> = {};
    const remainderOutVariables = {...this.outVariables};
    for (const [oldName, newName] of Object.entries(sourceVariableSlotMapping)) {
      outVariables[newName] = source.outVariables[oldName];
      delete remainderOutVariables[oldName];
    }

    const variables = this.fillSlots(outVariables);
    return new WebglVariables(source.template ? `${source.template}

${variables.template}` : variables.template,
      {...remainderOutVariables, ...outVariables},
    )
  }

  nameVariableSlots(nSlots: number) {
    return this.fillSlots(Object.fromEntries(
      Array(nSlots).fill(0).map((_, i) => {
        return [i.toString(), `a${Math.random().toFixed(16).substring(2)}`];
      })
    ));
  }

  static transpileNodeOutput(node: Node): string {
    let variables = node.webglOutput();

    return WebglVariables.FRAGMENT.fillSlots({
      "main": variables.template,
      "xyz": variables.outVariables["xyz"],
      "color": variables.outVariables["color"],
    }).template;
  }
}