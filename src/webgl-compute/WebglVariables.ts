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


float xyzToLabCompHelper(float comp) {
  return comp > (6./29.) * (6./29.) * (6./29.)
      ? pow(comp, 1./3.)
      : comp / (3. * (6./29.) * (6./29.)) + 4./29.;
}
vec3 xyzToLab(vec3 xyz, vec2 originalIlluminant, vec2 newIlluminant) {
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
vec3 labToXyz(vec3 lab, vec2 originalIlluminant, vec2 newIlluminant) {
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

// https://bottosson.github.io/posts/oklab/
vec3 xyzToOklab(vec3 xyz, vec2 originalIlluminant) {
  vec3 adaptedXyz = adaptXyz(xyz, originalIlluminant, illuminant2_D65);

  vec3 lms = transpose(mat3(
    0.8189330101, 0.3618667424, -0.1288597137,
    0.0329845436, 0.9293118715,  0.0361456387,
    0.0482003018, 0.2643662691,  0.6338517070
  )) * adaptedXyz;
  
  vec3 nonlinearLms = vec3(
    pow(lms.x, 1./3.),
    pow(lms.y, 1./3.),
    pow(lms.z, 1./3.)
  );

  return transpose(mat3(
    0.2104542553,  0.7936177850, -0.0040720468,
    1.9779984951, -2.4285922050,  0.4505937099,
    0.0259040371,  0.7827717662, -0.8086757660
  )) * nonlinearLms;
}
vec3 oklabToXyz(vec3 oklab, vec2 newIlluminant) {
  vec3 nonlinearLms = inverse(transpose(mat3(
    0.2104542553,  0.7936177850, -0.0040720468,
    1.9779984951, -2.4285922050,  0.4505937099,
    0.0259040371,  0.7827717662, -0.8086757660
  ))) * oklab;
  
  vec3 lms = nonlinearLms * nonlinearLms * nonlinearLms;

  vec3 xyz = inverse(transpose(mat3(
    0.8189330101, 0.3618667424, -0.1288597137,
    0.0329845436, 0.9293118715,  0.0361456387,
    0.0482003018, 0.2643662691,  0.6338517070
  ))) * lms;

  return adaptXyz(xyz, illuminant2_D65, newIlluminant);
}

vec3 lxxToLch(vec3 lxx) {
  return vec3(
    lxx.x,
    sqrt(lxx.y * lxx.y + lxx.z * lxx.z),
    atan(lxx.z, lxx.y) / REV
  );
}

vec3 lchToLxx(vec3 lch) {
  return vec3(
    lch.x,
    cos(lch.z * REV) * lch.y,
    sin(lch.z * REV) * lch.y
  );
}
`;

export class WebglModule {
  constructor(
    private readonly template: string,
    private readonly dependencies: WebglModule[] = [],
  ) {}
}

/** Stores a chunk of GLSL code with macro-like slots for variables. */
export class WebglVariables {
  static readonly FRAGMENT = new WebglVariables(`#version 300 es

#define PI 3.1415926538
#define REV 6.2831853071

precision mediump float;

in vec2 v_uv;
out vec4 fragColor;

uniform float outOfGamutAlpha;

{beforePrelude}

${prelude}

void main() {
  {main}
  
  vec3 gammaSrgb = xyzToGammaSrgb({xyz}, illuminant2_D65);

  float alpha = 1.;

  if (outOfGamutAlpha != 1.) {
    bool outOfGamut = 0. > gammaSrgb.r || gammaSrgb.r > 1.
        || 0. > gammaSrgb.g || gammaSrgb.g > 1.
        || 0. > gammaSrgb.b || gammaSrgb.b > 1.;
  
    if (outOfGamut) {
      alpha *= outOfGamutAlpha;
    }
  }

  fragColor = vec4(gammaSrgb, alpha);
}`,
    new Map([
      [undefined, {}],
    ]),
  );

  constructor(
    /** The GLSL code that takes in GLSL variables and computes new ones. Templates may include "slots" for GLSL code
     * or variables to be inserted.
     * 
     * A slot is of the form `{name}` or `{name:descriptor}`. Names that are only numbers belong to new variables that
     * result from the template's code.
     */
    readonly template: string,
    private readonly outVariables: Map<OutSocket | undefined, Record<string, string>>,
    /** A secondary template that declares variables in the prelude, inserted at the end. */
    private readonly preludeTemplate: string="",
    /** The names of uniforms (which can be variable slots), mapped to functions to initialize those uniforms. */
    private readonly uniforms: Record<string, (gl: WebGL2RenderingContext, unif: WebGLUniformLocation | null) => void>={},
  ) {}

  /** Fills in the given slots with values or true GLSL variables.
   * @param mappings Of the form {name: substitution}.
   */
  fillSlots(mappings: Record<string, string>, sourcePreludeTemplate: string="", sourceUniforms: WebglVariables["uniforms"]={}) {
    const outVariables: WebglVariables["outVariables"] = new Map(this.outVariables.entries());
    const uniforms: WebglVariables["uniforms"] = {...sourceUniforms, ...this.uniforms};

    const slotRegex = /\{(\w+)(?::(\w+))?\}/g;
    const mapMatchToValue = (match: string, keyName: string, descName: string) => mappings.hasOwnProperty(keyName)
        ? mappings[keyName]
        : match;

    const template = this.template.replaceAll(slotRegex, mapMatchToValue);

    let preludeTemplate = sourcePreludeTemplate
        ? `${sourcePreludeTemplate}
${this.preludeTemplate}`
        : this.preludeTemplate;

    preludeTemplate = preludeTemplate.replaceAll(slotRegex, mapMatchToValue);

    // Also look for slots in the `outVariables` substitution strings
    for (const [socket, variables] of outVariables) {
      const newOuts: Record<string, string> = {};
      for (const [name, value] of Object.entries(variables)) {
        newOuts[name] = value.replaceAll(slotRegex, mapMatchToValue);
      }
      outVariables.set(socket, newOuts);
    }
    for (const [name, value] of Object.entries(uniforms)) {
      delete uniforms[name];
      uniforms[name.replaceAll(slotRegex, mapMatchToValue)] = value;
    }

    return new WebglVariables(template, outVariables, preludeTemplate, uniforms);
  }

  fillWith(source: WebglVariables, socket: OutSocket | undefined, sourceVariableSlotMapping: Record<string, string>, keepSourcePrelude: boolean=false) {
    const outVariables: Record<string, string> = {};
    const remainderOutVariables = {...this.outVariables.get(socket)!};
    for (const [oldName, newName] of Object.entries(sourceVariableSlotMapping)) {
      outVariables[newName] = source.outVariables.get(socket)![oldName];
      delete remainderOutVariables[oldName];
    }

    return keepSourcePrelude
        ? this.fillSlots({...remainderOutVariables, ...outVariables}, source.preludeTemplate, source.uniforms)
        : this.fillSlots({...remainderOutVariables, ...outVariables});
  }

  join(target: WebglVariables) {
    // TODO
    return new WebglVariables(
      this.template,
      {...this.outVariables, ...target.outVariables},
      this.preludeTemplate,
      this.uniforms,
    )
  }

  /**
   * Inserts this object's template in front of another `WebglVariables`'s template, while substituting in
   * variables from the other object into this object
   * @param source The `WebglVariables` object to insert the variable source from
   * @param sourceVariableSlotMapping Mappings of variable names in `source` to variable slots in this object's
   * template
   * @returns 
   */
  /* follow(source: WebglVariables, sourceVariableSlotMapping: Record<string, string>) {
    const outVariables: Record<string, string> = {};
    const remainderOutVariables = {...this.outVariables};
    for (const [oldName, newName] of Object.entries(sourceVariableSlotMapping)) {
      outVariables[newName] = source.outVariables[oldName];
      delete remainderOutVariables[oldName];
    }

    const variables = this.fillSlots({...remainderOutVariables, ...outVariables});
    return new WebglVariables(source.template ? `${source.template}

${variables.template}` : variables.template,
      {...remainderOutVariables, ...outVariables},
      source.preludeTemplate ? `${source.preludeTemplate}
      
${variables.preludeTemplate}` : variables.preludeTemplate,
      {...source.uniforms, ...variables.uniforms},
    )
  }

  pipe(target: WebglVariables, variableSlotMapping: Record<string, string>) {
    return target.follow(this, variableSlotMapping);
  } */

  /**
   * Assigns random GLSL variable names to slots named with a number up to `nSlots`
   * @param nSlots 
   * @returns 
   */
  nameVariableSlots(nSlots: number) {
    return this.fillSlots(Object.fromEntries(
      Array(nSlots).fill(0).map((_, i) => {
        return [i.toString(), `a${Math.random().toFixed(16).substring(2)}`];
      })
    ));
  }

  initializeUniforms(gl: WebGL2RenderingContext, program: WebGLProgram) {
    for (const [unifName, initializeUnif] of Object.entries(this.uniforms)) {
      const unif = gl.getUniformLocation(program, unifName);
      initializeUnif(gl, unif);
    }
  }

  private static toposortDependencies(node: Node) {
    const topoOrder: Node[] = [];
    const visited = new Set<Node>();

    const dfs = (node: Node) => {
      visited.add(node);

      for (const socket of node.ins) {
        if (socket.usesFieldValue) continue;

        const srcNode = socket.link.srcNode;
        if (visited.has(srcNode)) continue;
        
        dfs(srcNode);
      }

      topoOrder.push(node);
    };
    dfs(node);

    return topoOrder;
  }

  static transpileNodeOutput(node: Node) {
    const dependencies = this.toposortDependencies(node);
    const dependencyIndices = new Map([...dependencies.entries()].map(([i, node]) => [node, i]));

    const segments: WebglVariables[] = [];

    dependencies.forEach((node, i) => {
      let variables = node.webglOutput();

      // for (const socket of node.outs) {
      //   if (socket.usesFieldValues) continue;
      //   variables = variables.join(node.webglOutput({socket}));
      // }

      for (const socket of node.ins) {
        if (socket.usesFieldValue) continue;

        const srcNode = socket.link.srcNode;
        const srcIndex = dependencyIndices.get(srcNode)!;

        variables = node.webglVariablesFill(segments[srcIndex], variables, socket);
      }
      segments[i] = variables;
    });

    const uniforms: WebglVariables["uniforms"] = {};
    for (const segment of segments) {
      Object.assign(uniforms, segment.uniforms);
    }

    // console.log(segments.map(segment => segment.template)
    //     .join("\n\n"));
    // console.log(segments.map(segment => segment.preludeTemplate)
    //     .join("\n"));
    // console.log(uniforms);

    return WebglVariables.FRAGMENT.fillSlots(
      {
        "main": segments.map(segment => segment.template)
            .join("\n\n"),
        "xyz": segments.at(-1)!.outVariables.get(undefined)!["xyz"],
        "beforePrelude": segments.map(segment => segment.preludeTemplate)
            .join("\n"),
      },
      "",
      uniforms);
  }
}