import { InSocket, Node, NodeOutputTarget, NodeUpdateSource, OutSocket, SocketType } from "@/models/Node";
import { webglDeclarations } from "@/models/colormanagement";

export class WebglModule {
  constructor(
    private readonly template: string,
    private readonly dependencies: WebglModule[] = [],
  ) {}
}

export class WebglSlot {
  private constructor(
    /** Determines whether this slot will receive a value to be filled later (input) or will provide a value that
     * results from a template's code (output).
     */
    readonly isInput: boolean,
    readonly identifier: string,
  ) {}

  static in(identifier: string) {
    return new WebglSlot(true, identifier);
  }

  static out(identifier: string) {
    return new WebglSlot(false, identifier);
  }
    
  static ins<S extends readonly string[]>(...identifiers: S): SlotMap<S> {
    return identifiers.reduce((acc, identifier) => Object.assign(acc, {[identifier]: new WebglSlot(true, identifier)}), {}) as SlotMap<S>;
  }
    
  static outs<S extends readonly string[]>(...identifiers: S): SlotMap<S>  {
    return identifiers.reduce((acc, identifier) => Object.assign(acc, {[identifier]: new WebglSlot(false, identifier)}), {}) as SlotMap<S>;
  }

  get isOutput(): boolean {
    return !this.isInput;
  }

  randomVariableName() {
    return `v_${this.identifier.replaceAll(/ |[^a-zA-Z0-9]/g, "_")}_${crypto.randomUUID().replaceAll("-", "_")}`;
  }
}

type SlotMap<S extends readonly string[]=any> = Record<S[number], WebglSlot>;

/** Stores chunks of WebGL code, between them macro-like variable slots to insert values into, as well as the values
 * which the slots have been assigned. */
export class WebglTemplate<InputSlots extends SlotMap=any, OutputSlots extends SlotMap=any> {
  private constructor(
    private readonly segments: TemplateStringsArray,
    private readonly inputSlots: InputSlots,
    private readonly outputSlots: OutputSlots,
    private readonly slots: WebglSlot[],
    private readonly substitutions: Map<WebglSlot, string>=new Map(),
  ) {}

  static code(segments: TemplateStringsArray, ...slots: WebglSlot[]): WebglTemplate {
    const inputSlots: SlotMap = {};
    const outputSlots: SlotMap = {};
    for (const slot of slots) {
      if (slot.isInput) {
        inputSlots[slot.identifier] = slot;
      } else {
        outputSlots[slot.identifier] = slot;
      }
    }

    return new WebglTemplate(segments, inputSlots, outputSlots, slots);
  }

  /** Creates a template consisting of just a slot. */
  static slot(slot: WebglSlot): WebglTemplate {
    return WebglTemplate.code`${slot}`;
  }

  static string(string: string) {
    return new WebglTemplate(Object.assign([string], {raw: [string]}), {}, {}, []);
  }

  static empty() {
    return WebglTemplate.string("");
  }

  static merge(...templates: WebglTemplate[]) {
    const newSegments: string[] = [];
    const newSegmentsRaw: string[] = [];
    for (const [templateIndex, template] of templates.entries()) {
      for (const [segmentIndex, segment] of template.segments.entries()) {
        if (segmentIndex === 0 && templateIndex > 0) {
          newSegments[newSegments.length - 1] = `${newSegments.at(-1)}${segment}`;
          newSegmentsRaw[newSegmentsRaw.length - 1] = `${newSegmentsRaw.at(-1)}${template.segments.raw[segmentIndex]}`;
          continue;
        }

        newSegments.push(segment);
        newSegmentsRaw.push(template.segments.raw[segmentIndex]);
      }
    }

    return new WebglTemplate(
      Object.assign(newSegments, {raw: newSegmentsRaw}),
      templates.reduce((acc, template) => Object.assign(acc, template.inputSlots), {}),
      templates.reduce((acc, template) => Object.assign(acc, template.outputSlots), {}),
      templates.flatMap(template => template.slots),
      new Map(templates.flatMap(template => [...template.substitutions])),
    );
  }

  substitute(substitutions: Map<WebglSlot, string>) {
    return new WebglTemplate(
      this.segments,
      this.inputSlots,
      this.outputSlots,
      this.slots,
      new Map([...this.substitutions, ...substitutions]),
    );
  }

  substituteInputs(getSubstitutions: (inputSlots: InputSlots) => Map<WebglSlot, string>) {
    return this.substitute(getSubstitutions(this.inputSlots));
  }

  toString() {
    if (!this.allInputsAreFilled()) {
      throw new Error(`Not all input slots are filled: ${
        Object.values(this.inputSlots)
            .filter(slot => !this.substitutions.has(slot))
            .map(slot => slot.identifier)
            .join(", ")
      }`);
    }

    return `${this.segments[0]}${this.slots.map((slot, i) => `${this.substitutions.get(slot)}${this.segments[i + 1]}`).join("")}`;
  }

  private allInputsAreFilled() {
    return Object.values(this.inputSlots).every(slot => this.substitutions.has(slot));
  }

  static withSlots<IIdentifiers extends readonly string[], OIdentifiers extends readonly string[]>(
    inputSlotIdentifiers: IIdentifiers,
    outputSlotIdentifiers: OIdentifiers,
    build: (
      inputSlots: SlotMap<IIdentifiers>,
      outputSlots: SlotMap<OIdentifiers>,
    ) => WebglTemplate<SlotMap<IIdentifiers>, SlotMap<OIdentifiers>>,
  ): WebglTemplate<SlotMap<IIdentifiers>, SlotMap<OIdentifiers>> {
    return build(WebglSlot.ins(...inputSlotIdentifiers), WebglSlot.outs(...outputSlotIdentifiers));
  }

  getOutputSlots() {
    return Object.values(this.outputSlots);
  }

  getInputSlot(identifier: string): WebglSlot {
    return this.inputSlots[identifier];
  }
}


type UniformInitializer = {
  set(gl: WebGL2RenderingContext, unif: WebGLUniformLocation | null, nUsedTextures: number): boolean | void,
  dependencySockets: InSocket[],
  /** For when a dependency is a `NodeSpecialInput` */
  dependencyNodes: Node[],
};


/** Stores a chunk of GLSL code with macro-like slots for variables. */
export class WebglVariables {
  static readonly fragmentShaderTemplate = WebglTemplate.withSlots(
    ["prelude", "main", "val", "illuminant", "xyz", "alpha"],
    [],
    (
      {prelude, main, val, illuminant, xyz, alpha},
      {},
    ) => WebglTemplate.merge(
      WebglTemplate.string(`#version 300 es

#define PI 3.1415926538
#define REV 6.2831853071

precision mediump float;

struct Color {
  vec3 val;
  vec2 illuminant;
  vec3 xyz;
};

struct AlphaColor {
  Color color;
  float alpha;
};

in vec2 v_uv;
out vec4 fragColor;

uniform float outOfGamutAlpha;

${webglDeclarations}
`),
      WebglTemplate.code`
${prelude}

AlphaColor sampleColor(vec2 coords) {
  ${main}
  
  return AlphaColor(Color(${val}, ${illuminant}, ${xyz}), ${alpha});
}

void main() {
  AlphaColor outColor = sampleColor(v_uv);
  vec3 outRgb = xyzToGammaSrgb(outColor.color.xyz, outColor.color.illuminant);

  float alpha = outColor.alpha;

  if (outOfGamutAlpha != 1.) {
    bool outOfGamut = -0.0001 > outRgb.r || outRgb.r > 1.0001
        || -0.0001 > outRgb.g || outRgb.g > 1.0001
        || -0.0001 > outRgb.b || outRgb.b > 1.0001;
  
    if (outOfGamut) {
      alpha *= outOfGamutAlpha;
    }
  }

  fragColor = vec4(outRgb, alpha);
}`,
    ),
  );

  static readonly auxiliaryFunctionTemplate = WebglTemplate.withSlots(
    ["outputType", "functionName", "main", "functionOutput"],
    [],
    (
      {outputType, functionName, main, functionOutput},
      {},
    ) => WebglTemplate.code`${outputType} ${functionName}(vec2 coords) {
  ${main}
  
  return ${functionOutput};
}`,
  );

  constructor(
    /** The GLSL code that takes in GLSL variables and computes new ones. Templates may include "slots" for other GLSL
     * code or GLSL variables to be inserted.
     */
    readonly template: WebglTemplate,
    /** Groups of values/slots which becomes available after evaluating the template, which are associated with
     * specific output sockets.
     */
    private readonly socketOutVariables: Map<OutSocket, Record<string, WebglTemplate>>,
    /** A group of values/slots which becomes available after evaluating the template, which is associated with a
     * node's special output (its display rather than an output socket).
     */
    private readonly nodeOutVariables: Record<string, WebglTemplate>={},
    /** A template that declares variables in the prelude, which is inserted after the main body has been produced.
     * Usually used for declaring new uniforms.
     */
    private readonly preludeTemplate: WebglTemplate=WebglTemplate.empty(),
    /** The names of uniforms, mapped to functions to initialize those uniforms. */
    private readonly uniforms: Map<WebglTemplate, UniformInitializer>=new Map(),
    /** The names of functions, mapped to sockets whose incoming data will be accessible by those functions rather than
     * from a separate variable defined inside the template. One use case is the Sample node, which needs to be able to
     * evaluate the input socket be evaluated at multiple different coordinates.
     */
    private readonly functionInputDependencies: Map<WebglTemplate, OutSocket>=new Map(),
  ) {}

  /** Fills in the given slots with strings. */
  substitute(substitutions: Map<WebglSlot, string>) {
    const socketOutVariables: WebglVariables["socketOutVariables"] = new Map(this.socketOutVariables);
    const nodeOutVariables: WebglVariables["nodeOutVariables"] = {...this.nodeOutVariables};
    const uniforms: WebglVariables["uniforms"] = new Map(this.uniforms);
    const functionDependencies: WebglVariables["functionInputDependencies"] = new Map(this.functionInputDependencies);

    const template = this.template.substitute(substitutions);

    let preludeTemplate = this.preludeTemplate.substitute(substitutions);

    // Also look for slots in the `outVariables` substitution strings
    for (const [socket, variables] of socketOutVariables) {
      const newOuts: Record<string, WebglTemplate> = {};
      for (const [name, value] of Object.entries(variables)) {
        newOuts[name] = value.substitute(substitutions);
      }
      socketOutVariables.set(socket, newOuts);
    }
    for (const [name, value] of Object.entries(nodeOutVariables)) {
      nodeOutVariables[name] = value.substitute(substitutions);
    }
    const newUniforms = new Map(uniforms);
    for (const [uniformNameTemplate, value] of uniforms) {
      newUniforms.delete(uniformNameTemplate);
      newUniforms.set(uniformNameTemplate.substitute(substitutions), value);
    }
    const newFunctionDependencies = new Map(functionDependencies);
    for (const [functionNameTemplate, value] of functionDependencies) {
      newFunctionDependencies.delete(functionNameTemplate);
      newFunctionDependencies.set(functionNameTemplate.substitute(substitutions), value);
    }

    return new WebglVariables(template, socketOutVariables, nodeOutVariables, preludeTemplate, newUniforms, newFunctionDependencies);
  }

  /**
   * 
   * @param source 
   * @param outputTarget 
   * @param sourceVariableSlotMapping Map that tells into which input slots in `this` to route the value of each output
   * slot in the `source`
   * @param keepSourcePrelude 
   * @param includeUnmappedVariables Whether slot names that are not included in `sourceVariableSlotMapping` will use
   * their original names from `source`'s `outVariables` list. If `false`, unmapped variables will not be included in
   * the new `WebglVariables` object
   * @returns 
   */
  substituteUsingOutputsFrom(
    source: WebglVariables,
    outputTarget: NodeOutputTarget,
    sourceVariableSlotMapping: Record<string, WebglSlot>,
    keepSourcePrelude: boolean=false,
    includeUnmappedVariables: boolean=false,
  ) {
    const substitutions = new Map<WebglSlot, string>();
    const remainingSubstitutions = new Map<WebglSlot, string>(
      includeUnmappedVariables
          ? Object.keys(source.outVariablesFor(outputTarget))
              .map(identifier => [this.template.getInputSlot(identifier), identifier])
          : []
    );
    for (const [varName, slot] of Object.entries(sourceVariableSlotMapping)) {
      substitutions.set(slot, source.outVariablesFor(outputTarget)[varName].toString());
      remainingSubstitutions.delete(slot);
    }

    return keepSourcePrelude
        ? this.prependPrelude(source.preludeTemplate)
            .prependUniforms(source.uniforms)
            .substitute(substitutions)
        : this.substitute(substitutions);
  }

  prependPrelude(prelude: WebglTemplate) {
    return new WebglVariables(
      this.template,
      this.socketOutVariables,
      this.nodeOutVariables,
      WebglTemplate.merge(prelude, this.preludeTemplate),
      this.uniforms,
      this.functionInputDependencies,
    );
  }

  prependUniforms(uniforms: WebglVariables["uniforms"]) {
    return new WebglVariables(
      this.template,
      this.socketOutVariables,
      this.nodeOutVariables,
      this.preludeTemplate,
      new Map([...uniforms, ...this.uniforms]),
      this.functionInputDependencies,
    );
  }

  /**
   * Assigns random GLSL variable names to slots named with a number up to `nSlots`
   * @param nSlots 
   * @returns 
   */
  private nameOutputSlots() {
    return this.substitute(
      new Map([...this.outputSlots()].map(slot => [slot, slot.randomVariableName()])),
    );
  }

  private outputSlots() {
    return new Set<WebglSlot>([
      ...this.template.getOutputSlots(),
      ...[...this.socketOutVariables.values()].flatMap(record => Object.values(record).flatMap(template => template.getOutputSlots())),
      ...Object.values(this.nodeOutVariables).flatMap(template => template.getOutputSlots()),
      ...[...this.uniforms.keys()].flatMap(template => template.getOutputSlots()),
      ...[...this.functionInputDependencies.keys()].flatMap(template => template.getOutputSlots()),
    ]);
  }

  /**
   * Iterates through the nodes which the given node `node` depends on, generating code segment templates for each
   * node. Each node's code segment has its slots filled by the outputs of the nodes before it in the dependency
   * tree.
   * @param node 
   * @returns 
   */
  private static getTranspiledNodeDependencies(node: Node) {
    const dependencyIndices = new Map<Node, number>();
    const segments: WebglVariables[] = [];

    let i = 0;
    for (const dependencyNode of node.toposortedDependencies()) {
      let variables = node.webglOutput();

      const functionDependencySockets = new Set<OutSocket>();

      for (const [functionName, srcSocket] of variables.functionInputDependencies) {
        functionDependencySockets.add(srcSocket);

        const preludeFunction = this.getTranspiledAuxiliaryFunction(srcSocket, functionName.toString(), segments, dependencyIndices.get(srcSocket.node)!);
        variables = variables.prependPrelude(preludeFunction);
      }

      for (const socket of node.ins) {
        if (socket.usesFieldValue) continue;
        if (functionDependencySockets.has(socket.link.src)) continue;

        const srcNode = socket.link.srcNode;
        const srcIndex = dependencyIndices.get(srcNode)!;
        variables = node.webglVariablesFill(segments[srcIndex], variables, socket);
      }

      segments[i] = variables;
      dependencyIndices.set(dependencyNode, i);

      i++;
    }

    const uniforms: Record<string, UniformInitializer> = {};
    for (const segment of segments) {
      for (const [uniformName, initializer] of segment.uniforms) {
        uniforms[uniformName.toString()] = initializer;
      }
    }

    return {
      segments,
      uniforms,
    };
  }

  /**
   * Using precomputed segments from `getTranspiledNodeDepencies`, generates a `WebglTemplate` that provides an
   * auxiliary function for the node specified by `nodeIndex`
   * @param socket 
   * @param functionNameValue 
   * @param segments 
   * @param nodeIndex 
   * @returns 
   */
  private static getTranspiledAuxiliaryFunction(socket: OutSocket, functionNameValue: string, segments: WebglVariables[], nodeIndex: number): WebglTemplate {
    let outputTypeValue: string;
    let outputVariables: WebglVariables;
    switch (socket.type) {
      case SocketType.ColorCoords:
        outputTypeValue = "Color";
        outputVariables = WebglVariables.template`Color(${WebglSlot.in("val")}, ${WebglSlot.in("illuminant")}, ${WebglSlot.in("xyz")})`();
        break;

      case SocketType.Vector:
      case SocketType.VectorOrColor:
        outputTypeValue = "vec3";
        outputVariables = WebglVariables.template`${WebglSlot.in("val")}`();
        break;

      case SocketType.Float:
        outputTypeValue = "float";
        outputVariables = WebglVariables.template`${WebglSlot.in("val")}`();
        break;
      
      default:
        throw new Error("unsupported type");
    }

    const relevantSegments = segments.slice(0, nodeIndex + 1);

    return WebglVariables.auxiliaryFunctionTemplate.substituteInputs(
      ({main, outputType, functionName, functionOutput}) => new Map([
        [main, relevantSegments.map(segment => segment.template.toString())
            .join("\n\n")],
        // no prelude/uniforms because uniforms will be shared with the primary function
        [functionOutput, outputVariables.substituteUsingOutputsFrom(segments[nodeIndex], NodeOutputTarget.OutSocket(socket), {}, false, true).template.toString()],
        [outputType, outputTypeValue],
        [functionName, functionNameValue],
      ]),
    );
  }

  /**
   * Generates WebGL source code that computes the output of node `node`.
   * @param node 
   * @returns 
   */
  static transpileNodeOutput(node: Node) {
    const {segments, uniforms} = this.getTranspiledNodeDependencies(node);

    // console.log(segments.map(segment => segment.template)
    //     .join("\n\n"));
    // console.log(segments.map(segment => segment.preludeTemplate)
    //     .join("\n"));
    // console.log(uniforms);

    return new WebglTranspilation(
      WebglVariables.fragmentShaderTemplate.substituteInputs(
        ({main, val, xyz, illuminant, prelude, alpha}) => new Map([
          [main, segments.map(segment => segment.template.toString())
              .join("\n\n")],
          [val, segments.at(-1)!.nodeOutVariables["val"].toString()],
          [xyz, segments.at(-1)!.nodeOutVariables["xyz"]?.toString()],
          [illuminant, segments.at(-1)!.nodeOutVariables["illuminant"]?.toString() ?? "illuminant2_D65"],
          [alpha, segments.at(-1)!.nodeOutVariables["alpha"]?.toString() ?? "1."],
          [prelude, segments.map(segment => segment.preludeTemplate.toString())
              .join("\n")],
        ]),
      ).toString(),
      uniforms,
    );
  }

  private outVariablesFor(target: NodeOutputTarget) {
    return target.match({
      onSocket: socket => this.socketOutVariables.get(socket)!,
      onNode: () => this.nodeOutVariables,
    });
  }

  static template(strings: TemplateStringsArray, ...slots: WebglSlot[]) {
    return this.fromTemplate(WebglTemplate.code(strings, ...slots));
  }

  static fromTemplate(template: WebglTemplate) {
    return ({
      socketOutVariables=new Map(),
      nodeOutVariables={},
      preludeTemplate=WebglTemplate.empty(),
      uniforms=new Map(),
      functionInputDependencies=new Map(),
    }: {
      socketOutVariables?: WebglVariables["socketOutVariables"],
      nodeOutVariables?: WebglVariables["nodeOutVariables"],
      preludeTemplate?: WebglVariables["preludeTemplate"],
      uniforms?: WebglVariables["uniforms"],
      functionInputDependencies?: WebglVariables["functionInputDependencies"],
    }={}) => {
      return new WebglVariables(
        template,
        socketOutVariables,
        nodeOutVariables,
        preludeTemplate,
        uniforms,
        functionInputDependencies,
      ).nameOutputSlots();
    };
  }
}

export class WebglTranspilation {
  constructor(
    readonly shaderSource: string,
    private readonly uniforms: Record<string, UniformInitializer>,
  ) {}

  initializeUniforms(gl: WebGL2RenderingContext, program: WebGLProgram): UniformReloadData {
    const textureIdMap = new Map<WebGLUniformLocation, number>();
    const socketDependents = new Map<InSocket, string[]>();
    const nodeDependents = new Map<Node, string[]>();

    let nUsedTextures = 0;
    for (const [unifName, {set: initializeUnif, dependencySockets, dependencyNodes}] of Object.entries(this.uniforms)) {
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

      for (const node of dependencyNodes) {
        if (nodeDependents.has(node)) {
          nodeDependents.get(node)!.push(unifName);
        } else {
          nodeDependents.set(node, [unifName]);
        }
      }
    }

    return {
      textureIdMap,
      socketDependents,
      nodeDependents,
    };
  }

  refreshUniforms(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    updateSource: NodeUpdateSource,
    uniformData: UniformReloadData,
  ) {

    const dependents = 
        updateSource.socket.mapElse(
          socket => uniformData.socketDependents.get(socket) ?? [],
          () => updateSource.node.mapElse(
            node => uniformData.nodeDependents.get(node) ?? [],
            () => {
              throw new TypeError();
            },
          ),
        );

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
}

export type UniformReloadData = {
  textureIdMap: Map<WebGLUniformLocation, number>,
  socketDependents: Map<InSocket, string[]>,
  nodeDependents: Map<Node, string[]>,
};