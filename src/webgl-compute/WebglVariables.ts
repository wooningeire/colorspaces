import { InSocket, Node, NodeOutputTarget, OutSocket, SocketType } from "@/models/Node";
import { webglDeclarations } from "@/models/colormanagement";

export class WebglModule {
  constructor(
    private readonly template: string,
    private readonly dependencies: WebglModule[] = [],
  ) {}
}

/** Stores a chunk of GLSL code with macro-like slots for variables. */
export class WebglVariables {
  static readonly fragmentShaderTemplate = new WebglVariables(`#version 300 es

#define PI 3.1415926538
#define REV 6.2831853071

precision mediump float;

struct Color {
  vec3 val;
  vec2 illuminant;
  vec3 xyz;
};

in vec2 v_uv;
out vec4 fragColor;

uniform float outOfGamutAlpha;

${webglDeclarations}

{afterPrelude}

Color sampleColor(vec2 coords) {
  {main}
  
  return Color({val}, {illuminant}, {xyz});
}

void main() {
  Color outColor = sampleColor(v_uv);
  vec3 outRgb = xyzToGammaSrgb(outColor.xyz, outColor.illuminant);

  float alpha = 1.;

  if (outOfGamutAlpha != 1.) {
    bool outOfGamut = 0. > outRgb.r || outRgb.r > 1.
        || 0. > outRgb.g || outRgb.g > 1.
        || 0. > outRgb.b || outRgb.b > 1.;
  
    if (outOfGamut) {
      alpha *= outOfGamutAlpha;
    }
  }

  fragColor = vec4(outRgb, alpha);
}`,
    new Map([
      [null, {}],
    ]),
  );

  static readonly auxiliaryFunctionTemplate = new WebglVariables(`{outputType} {functionName}(vec2 coords) {
  {main}
  
  return {output};
}`,
    new Map([
      [null, {}],
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
    private readonly outVariables: Map<NodeOutputTarget, Record<string, string>>,
    /** A secondary template that declares variables in the prelude, inserted after the main body has been produced. */
    private readonly preludeTemplate: string="",
    /** The names of uniforms (which can be variable slots), mapped to functions to initialize those uniforms. */
    private readonly uniforms: Record<string, {
      set(gl: WebGL2RenderingContext, unif: WebGLUniformLocation | null, nUsedTextures: number): boolean | void,
      /** Can be a `Node` if the dependency is a `NodeSpecialInput` */
      dependencySockets: (Node | InSocket)[],
    }>={},
    /** The names of functions (which can be variable slots), mapped to sockets whose outputs will be converted to the
     * bodies of those functions rather than included in the template.
     */
    private readonly functionDependencies: Record<string, OutSocket>={},
  ) {}

  /** Fills in the given slots with values or true GLSL variables.
   * @param mappings Of the form {name: substitution}.
   */
  fillSlots(mappings: Record<string, string>, sourcePreludeTemplate: string="", sourceUniforms: WebglVariables["uniforms"]={}) {
    const outVariables: WebglVariables["outVariables"] = new Map(this.outVariables.entries());
    const uniforms: WebglVariables["uniforms"] = {...sourceUniforms, ...this.uniforms};
    const functionDependencies: WebglVariables["functionDependencies"] = {...this.functionDependencies};

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
    for (const [name, value] of Object.entries(functionDependencies)) {
      delete functionDependencies[name];
      functionDependencies[name.replaceAll(slotRegex, mapMatchToValue)] = value;
    }

    return new WebglVariables(template, outVariables, preludeTemplate, uniforms, functionDependencies);
  }

  /**
   * 
   * @param source 
   * @param socket 
   * @param sourceVariableSlotMapping 
   * @param keepSourcePrelude 
   * @param includeUnmappedVariables Whether slot names that are not included in `sourceVariableSlotMapping` will use
   * the names from `source`'s `outVariables` list
   * @returns 
   */
  fillWith(
    source: WebglVariables,
    socket: NodeOutputTarget,
    sourceVariableSlotMapping: Record<string, string>,
    keepSourcePrelude: boolean=false,
    includeUnmappedVariables: boolean=false,
  ) {
    const outVariables: Record<string, string> = {};
    const remainderOutVariables = includeUnmappedVariables ? {...source.outVariables.get(socket)!} : {};
    for (const [oldName, newName] of Object.entries(sourceVariableSlotMapping)) {
      outVariables[newName] = source.outVariables.get(socket)![oldName];
      delete remainderOutVariables[oldName];
    }

    return keepSourcePrelude
        ? this.fillSlots({...remainderOutVariables, ...outVariables}, source.preludeTemplate, source.uniforms)
        : this.fillSlots({...remainderOutVariables, ...outVariables});
  }

  joinPrelude(prelude: string) {
    return new WebglVariables(
      this.template,
      this.outVariables,
      `${prelude}\n\n${this.preludeTemplate}`,
      this.uniforms,
      this.functionDependencies,
    );
  }

  joinUniforms(uniforms: WebglVariables["uniforms"]) {
    return new WebglVariables(
      this.template,
      this.outVariables,
      this.preludeTemplate,
      {...uniforms, ...this.uniforms},
      this.functionDependencies,
    );
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

  initializeUniforms(gl: WebGL2RenderingContext, program: WebGLProgram): UniformReloadData {
    const textureIdMap = new Map<WebGLUniformLocation, number>();
    const socketDependents = new Map<Node | InSocket, string[]>();

    let nUsedTextures = 0;
    for (const [unifName, {set: initializeUnif, dependencySockets}] of Object.entries(this.uniforms)) {
      const unif = gl.getUniformLocation(program, unifName)!;

      const usedTexture = initializeUnif(gl, unif, nUsedTextures);

      if (usedTexture) {
        textureIdMap.set(unif, nUsedTextures);
        nUsedTextures++;
      }

      for (const socket of dependencySockets) {
        if (socketDependents.has(socket)) {
          socketDependents.get(socket)!.push(unifName);
        } else {
          socketDependents.set(socket, [unifName]);
        }
      }
    }

    return {
      textureIdMap,
      socketDependents,
    };
  }

  refreshUniforms(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    socket: Node | InSocket,
    uniformData: UniformReloadData,
  ) {
    const dependents = uniformData.socketDependents.get(socket) ?? [];

    for (const unifName of dependents) {
      const {set: initializeUnif} = this.uniforms[unifName];

      const unif = gl.getUniformLocation(program, unifName)!;

      if (uniformData.textureIdMap.has(unif!)) {
        initializeUnif(gl, unif, uniformData.textureIdMap.get(unif)!);
      } else {
        initializeUnif(gl, unif, 0);
      }
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

  private static getTranspiledNodeOutputSegments(node: Node) {
    const dependencies = this.toposortDependencies(node);
    const dependencyIndices = new Map([...dependencies.entries()].map(([i, node]) => [node, i]));

    const segments: WebglVariables[] = [];

    dependencies.forEach((node, i) => {
      let variables = node.webglOutput();

      // for (const socket of node.outs) {
      //   if (socket.usesFieldValues) continue;
      //   variables = variables.join(node.webglOutput({socket}));
      // }

      const functionDependencySockets = new Set<OutSocket>();

      for (const [functionName, srcSocket] of Object.entries(variables.functionDependencies)) {
        functionDependencySockets.add(srcSocket);

        const preludeFunction = this.getTranspiledNodeOutputFunction(srcSocket, functionName, segments, dependencyIndices.get(srcSocket.node)!);
        variables = variables.joinPrelude(preludeFunction.template);
      }

      for (const socket of node.ins) {
        if (socket.usesFieldValue) continue;
        if (functionDependencySockets.has(socket.link.src)) continue;

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

    return {
      segments,
      uniforms,
    };
  }

  private static getTranspiledNodeOutputFunction(socket: OutSocket, functionName: string, segments: WebglVariables[], nodeIndex: number) {
    let outputType: string;
    let outputVariables: WebglVariables;
    switch (socket.type) {
      case SocketType.ColorCoords:
        outputType = "Color";
        outputVariables = new WebglVariables("Color({val}, {illuminant}, {xyz})", new Map([]));
        break;

      case SocketType.Vector:
      case SocketType.VectorOrColor:
        outputType = "vec3";
        outputVariables = new WebglVariables("{val}", new Map([]));
        break;

      case SocketType.Float:
        outputType = "float";
        outputVariables = new WebglVariables("{val}", new Map([]));
        break;
      
      default:
        throw new Error("unsupported type");
    }

    const relevantSegments = segments.slice(0, nodeIndex + 1);

    return WebglVariables.auxiliaryFunctionTemplate.fillSlots(
      {
        "main": relevantSegments.map(segment => segment.template)
            .join("\n\n"),
        // no prelude/uniforms because uniforms will be shared with the primary function
        "output": outputVariables.fillWith(segments[nodeIndex], socket, {}, false, true).template,
        "outputType": outputType,
        "functionName": functionName,
      },
    );
  }

  static transpileNodeOutput(node: Node) {
    const {segments, uniforms} = this.getTranspiledNodeOutputSegments(node);

    // console.log(segments.map(segment => segment.template)
    //     .join("\n\n"));
    // console.log(segments.map(segment => segment.preludeTemplate)
    //     .join("\n"));
    // console.log(uniforms);

    return WebglVariables.fragmentShaderTemplate.fillSlots(
      {
        "main": segments.map(segment => segment.template)
            .join("\n\n"),
        "val": segments.at(-1)!.outVariables.get(null)!["val"],
        "xyz": segments.at(-1)!.outVariables.get(null)!["xyz"],
        "illuminant": segments.at(-1)!.outVariables.get(null)!["illuminant"],
        "afterPrelude": segments.map(segment => segment.preludeTemplate)
            .join("\n"),
      },
      "",
      uniforms,
    );
  }
}

class WebglTranspilation {

}

export interface UniformReloadData {
  textureIdMap: Map<WebGLUniformLocation, number>,
  socketDependents: Map<Node | InSocket, string[]>,
}