import { Node, OutSocket } from "@/models/Node";
import { webglDeclarations } from "@/models/colormanagement";

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

${webglDeclarations}

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