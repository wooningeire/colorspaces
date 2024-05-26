import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";
import { NO_DESC, StringKey } from "../strings";
import { Vec2, Vec3, Option } from "../util";
import { Col } from "./colormanagement";

export class Tree {
  readonly nodes = new Set<Node>();

  * links() {
    for (const node of this.nodes) {
      for (const socket of node.ins) {
        if (!socket.hasLinks) continue;

        yield socket.link;
      }
    }
  }

  deleteNode(node: Node) {
    this.nodes.delete(node);

    [...node.ins, ...node.outs]
        .map(socket => socket.links)
        .flat()
        .forEach(link => link.unlink());
  }

  clear() {
    for (const node of this.nodes) {
      this.deleteNode(node);
    }
  }
}

export enum OutputDisplayType {
  None,
  Float,
  Color,
  Vec,
  Css,
  Custom,
}

export type NodeDisplay = {
  labels: StringKey[],
  values: number[],
  flags: SocketFlag[],
};

export abstract class Node {
  static readonly TYPE: symbol = Symbol();
  static readonly id: string = "";
  static get LABEL(): StringKey | string {
    return `label.node.${this.id}`;
  }
  static get DESC(): StringKey | string {
    return `desc.node.${this.id}`;
  };
  static readonly outputDisplayType: OutputDisplayType = OutputDisplayType.None;

  readonly ins: InSocket[] = [];
  readonly outs: OutSocket[] = [];

  private static nextId = 0;
  readonly id = Node.nextId++;

  /** Used to memoize values */
  private memo = new WeakMap<() => any, any>();


  width = 140;
  pos: Vec2 = [0, 0];
  readonly minWidth = this.width;
  readonly canMove = true;
  readonly canEditLinks = true;
  setPos(pos: Vec2) { this.pos = pos; return this; }
  setWidth(width: number) { this.width = width; return this; }

  // Note: If subclass constructor is called, `new.target` is the subclass
  constructor(
    readonly type: symbol=new.target.TYPE,
    readonly label: StringKey | string=new.target.LABEL,
  ) {}

  /** A `WebglVariables` object that provides a template to fill, output variables, and uniforms */
  webglBaseVariables(): WebglVariables {
    return WebglVariables.empty({ node: this });
  }
  
  /**
   * @returns A group of values/slots which becomes available after evaluating the template given from
   * `this.webglBaseVariables`. The values from this method in particular are associated with a node's output
   * display, rather than an output socket. Each output value is associated with a symbol (the key of the `Record`)
   * which is used to map it to a slot in another template.
   */
  webglOutputs(): WebglOutputs {
    return {};
  }

  display(context: NodeEvalContext): NodeDisplay {
    return {
      values: [],
      labels: [],
      flags: [],
    };
  }
  
  /**display(context: NodeEvalContext={}): NodeDisplay {
    return {
      values: this.displayValues(context),
      labels: this.displayLabels,
      flags: this.displayFlags,
    };
  }

  abstract displayValues(context: NodeEvalContext): any;

  get displayLabels(): string[] {
    return [];
  }

  get displayFlags(): SocketFlag[] {
    return [];
  }*/

  /**
   * Called when a new link is added to any socket on this node, but not if the link is immediately replaced
   */
  onSocketLink(socket: Socket, link: Link) {
    this.markCyclicalLinks();
  }

  // /**
  //  * Called when a link to any socket on this node is replaced with another
  //  */
  // onSocketReplace(socket: Socket, link: Link, tree: Tree) {
  //   Node.prototype.onSocketLink.call(this, socket, link, tree);
  // }

  /**
   * Called when a link is removed from any socket in this node, but not if the link is immediately replaced
   * @param socket 
   * @param link 
   * @param tree 
   */
  onSocketUnlink(socket: Socket, link: Link) {
    this.markCyclicalLinks();
  }

  onSocketFieldValueChange(socket: Socket) {
    this.onDependencyUpdate();
  }

  onDependencyUpdate() {
    // Clear the memoized values
    this.memo = new WeakMap();
  }

  /** Memoizes a value once computed */
  memoize<T>(fn: () => T): T {
    if (this.memo.has(fn)) {
      return this.memo.get(fn);
    }

    const value = fn();
    this.memo.set(fn, value);
    return value;
  }

  // Eventually adapted into `findCyclicalLinks`
  /* hasCircularDependency(visitedNodes=new Set<Node>()): boolean {
    if (visitedNodes.has(this)) return true;
    visitedNodes.add(this);

    for (const socket of this.ins) {
      for (const link of socket.links) {
        const cyclesFound = link.srcNode.hasCircularDependency(new Set(visitedNodes));
        if (cyclesFound) return true;
      }
    }

    return false;
  }

  getCyclicalNodes(visitedNodes=new Set<Node>(), duplicateNodes=new Set<Node>()): Set<Node> {
    if (duplicateNodes.has(this)) {
      return duplicateNodes;
    } else if (visitedNodes.has(this)) {
      duplicateNodes.add(this);
    } else {
      visitedNodes.add(this);
    }

    for (const socket of this.ins) {
      for (const link of socket.links) {
        link.srcNode.getCyclicalNodes(new Set(visitedNodes), duplicateNodes);
      }
    }

    return duplicateNodes;
  } */

  private markCyclicalLinks() {
    const {duplicateLinks, allVisitedLinks} = this.findCyclicalLinks();
    for (const link of allVisitedLinks) {
      link.causesCircularDependency = duplicateLinks.has(link);
    }
  }

  findCyclicalLinks(visitedLinks=new Set<Link>(), duplicateLinks=new Set<Link>(), allVisitedLinks=new Set<Link>()) {
    this.forEachInLink(link => {
      if (duplicateLinks.has(link)) {
        return;
      } else if (visitedLinks.has(link)) {
        duplicateLinks.add(link);
      } else {
        visitedLinks.add(link);
        allVisitedLinks.add(link);
      }

      link.srcNode.findCyclicalLinks(new Set(visitedLinks), duplicateLinks, allVisitedLinks);
    });

    return {
      duplicateLinks,
      allVisitedLinks,
    };
  }

  isAxisNode(): this is AxisNode {
    return "axes" in this;
  }

  getDependencyAxes() {
    const axes = new Set<number>();

    if (this.isAxisNode()) {
      this.axes.forEach(axis => axes.add(axis));
    }

    for (const socket of this.ins) {
      if (socket.constant) continue;

      for (const link of socket.links) {
        if (link.causesCircularDependency || link.src.constant) continue;
        
        for (const axis of link.srcNode.getDependencyAxes()) {
          axes.add(axis);
        }
      }
    }
    return axes;
  }

  forEachInLink(fn: (link: Link) => void) {
    for (const socket of this.ins) {
      for (const link of socket.links) {
        fn(link);
      }
    }
  }

  dependentNodes(): Generator<Node, void, void> {
    return this.dfsDependentNodes(new Set());
  }
  private * dfsDependentNodes(visitedNodes: Set<Node>): Generator<Node, void, void> {
    yield this;

    for (const out of this.outs) {
      for (const link of out.links) {
        if (link.causesCircularDependency) continue;

        if (visitedNodes.has(link.dstNode)) continue;
        visitedNodes.add(link.dstNode);
        yield* link.dstNode.dfsDependentNodes(visitedNodes);
      }
    }
  }

  /** Generates the list of nodes which this node depends on, in topological order. */
  toposortedDependencies() {
    return this.dfsDependencies(new Set());
  }

  /** Performs a depth-first search of this node's dependencies. */
  private * dfsDependencies(visited: Set<Node>): Generator<Node, void, void> {
    visited.add(this);

    for (const socket of this.ins) {
      if (socket.usesFieldValue) continue;

      const srcNode = socket.link.srcNode;
      if (visited.has(srcNode)) continue;
      
      yield* srcNode.dfsDependencies(visited);
    }

    yield this;
  }
}

export interface AxisNode extends Node {
  readonly axes: number[];
}

export interface NodeEvalContext {
  readonly coords?: Vec2;
}


export enum SocketType {
  Unknown,
  DynamicAny,
  Float,
  Integer,
  Vector,
  VectorOrColor,
  Color,
  Dropdown,
  Image,
  Bool,
  String,
}
export type SocketValue<St extends SocketType=any> =
    St extends SocketType.Float ? number :
    St extends SocketType.Integer ? number :
    St extends SocketType.Vector ? Vec3 :
    St extends SocketType.Color ? Col :
    St extends SocketType.VectorOrColor ? Vec3 | Col :
    St extends SocketType.Dropdown ? string :
    St extends SocketType.Image ? ImageData :
    St extends SocketType.Bool ? boolean :
    St extends SocketType.String ? string :
    St extends SocketType.DynamicAny ? any :
    never;

/** In ascending order */
const socketTypesByRestrictiveness = [
  [SocketType.DynamicAny],
  [SocketType.VectorOrColor],
  [SocketType.Color],
  [SocketType.Vector],
  [SocketType.Float],
  [SocketType.Bool],
  [SocketType.Integer],
];

export const socketTypeRestrictiveness = new Map<SocketType, number>(
  socketTypesByRestrictiveness.flatMap((types, i) => types.map(type => [type, i])),
);

/** Standard outputs that are generated by output sockets. */
export const webglStdOuts = Object.freeze({
  float: Symbol("float"),
  integer: Symbol("integer"),
  vector: Symbol("vector"),
  color: Symbol("color"),
  bool: Symbol("bool"),
  alpha: Symbol("alpha"),
}) as unknown as {
  readonly float: unique symbol,
  readonly integer: unique symbol,
  readonly vector: unique symbol,
  readonly color: unique symbol,
  readonly bool: unique symbol,
  readonly alpha: unique symbol,
};

export type WebglStdOut = typeof webglStdOuts[keyof typeof webglStdOuts];

export const socketTypeToStdOut = new Map<SocketType, WebglStdOut>([
  [SocketType.Float, webglStdOuts.float],
  [SocketType.Integer, webglStdOuts.integer],
  [SocketType.Vector, webglStdOuts.vector],
  [SocketType.VectorOrColor, webglStdOuts.vector],
  [SocketType.Color, webglStdOuts.color],
  [SocketType.Bool, webglStdOuts.bool],
])

/** Object that provides GLSL expressions used to obtain the values of certain standard outputs from an output socket
 * after executing the GLSL code in its node's `WebglVariables` object.
 * 
 * Even if a socket's `SocketType` can be coerced into another, this object does not include the standard
 * outputs of the socket types which it can be coerced into, so as to avoid repetition in the codebase;
 * `WebglSocketVirtualOutputs` handles coercion instead.
 */
export type WebglSocketOutputs<St extends SocketType=any> =
    St extends SocketType.Float ? {
      [webglStdOuts.float]: WebglTemplate,
    } :
    St extends SocketType.Integer ? {
      [webglStdOuts.integer]: WebglTemplate,
    } :
    St extends SocketType.Vector ? {
      [webglStdOuts.vector]: WebglTemplate,
    } :
    St extends SocketType.Color ? {
      [webglStdOuts.color]: WebglTemplate,
    } :
    St extends SocketType.VectorOrColor ? WebglSocketOutputs<SocketType.Vector> | WebglSocketOutputs<SocketType.Color> :
    St extends SocketType.Dropdown ? {} :
    St extends SocketType.Image ? {} :
    St extends SocketType.Bool ? {
      [webglStdOuts.bool]: WebglTemplate,
    } :
    {};

export type WebglOutputs = Record<symbol, WebglTemplate>;

/** Object that describes which slots into which to route the different standard outputs that may result from an output
 * socket.
 */
export type WebglOutputMapping<St extends SocketType=any> = Partial<{[K in keyof WebglSocketOutputs<St>]: WebglSlot}>;


export enum SocketFlag {
  None = 0,
  Rgb = 1 << 0,
  Hue = 1 << 1,
}

export type SliderProps = {
  hasBounds?: boolean,
  softMin?: number,
  softMax?: number,
  min?: number,
  max?: number,
  step?: number,
  unboundedChangePerPixel?: number,
};

/** Properties specific to the socket type */
type SocketData<St extends SocketType=any> =
    St extends SocketType.Dropdown ? {
      options?: {
        value: string,
        text: StringKey,
      }[],
    } :
    St extends SocketType.Float ? {
      sliderProps?: SliderProps,
    } :
    St extends SocketType.Integer ? {
      sliderProps?: SliderProps,
    } :
    St extends SocketType.Vector ? {
      sliderProps?: SliderProps[],
    } :
    St extends SocketType.VectorOrColor ? {
      sliderProps?: SliderProps[],
    } :
    {};


export type SocketOptions<St extends SocketType=any> = {
  showSocket?: boolean,
  desc?: StringKey,
  fieldText?: StringKey[],
  labelSubstitutions?: string[],
  defaultValue?: SocketValue<St>,
  hasDynamicType?: boolean,
  showFieldIfAvailable?: boolean,
  valueChangeRequiresShaderReload?: boolean,
  constant?: boolean,
  onValueChange?: (this: Socket<St>) => void,
  onLink?: (this: Socket<St>, link: Link) => void,
  onUnlink?: (this: Socket<St>, link: Link) => void,
  onInputTypeChange?: (this: Socket<St>, type: SocketType) => void,
  onOutputTypeChange?: (this: Socket<St>, type: SocketType) => void,
} & SocketData<St>;
export type InSocketOptions<St extends SocketType=any> = {
  /** A mapping from output names from an incoming source socket (that is linked to this socket) to input slots in
   * `webglBaseVariables`
   */
  webglOutputMappingStatic?: WebglOutputMapping<St>,
  webglOutputMapping?: (socket: InSocket<St>) => () => WebglOutputMapping<St>,
} & SocketOptions<St>;
export type OutSocketOptions<St extends SocketType=any> = {
  /**
   * @see WebglSocketOutputs<St>
   * @param socket 
   * @returns 
   */
  webglOutputs: (socket: OutSocket<St>) => () => WebglSocketOutputs<St>,
} & SocketOptions<St>;

export abstract class Socket<St extends SocketType=any> {
  private static nextId = 0;
  readonly id = Socket.nextId++;

  private static readonly defaultValues = new Map<SocketType, SocketValue>([
    [SocketType.Float, 0],
    [SocketType.Integer, 0],
    [SocketType.Vector, [0, 0, 0]],
    [SocketType.VectorOrColor, [0, 0, 0]],
    [SocketType.Bool, false],
  ]);

  /** Specifies what destination socket types a source socket type can be linked to, if it cannot be determined
   * automatically */
  private static readonly typeCanBeLinkedTo = new Map<SocketType, SocketType[]>([
    [SocketType.Vector, [SocketType.Vector, SocketType.VectorOrColor]],
    [SocketType.Color, [SocketType.Color, SocketType.VectorOrColor, SocketType.Vector]],
    [SocketType.Bool, [SocketType.Bool, SocketType.Float, SocketType.Integer, SocketType.Vector, SocketType.VectorOrColor]],
    [SocketType.Integer, [SocketType.Integer, SocketType.Float, SocketType.Vector, SocketType.VectorOrColor]],
    [SocketType.Float, [SocketType.Float, SocketType.Vector, SocketType.VectorOrColor]],
  ]);

  /** Checks if a source socket type can be linked to a destination socket type */
  static canLinkTypes(srcType: SocketType, dstType: SocketType) {
    return dstType === SocketType.DynamicAny
        || srcType === SocketType.DynamicAny
        || (this.typeCanBeLinkedTo.get(srcType)?.includes(dstType)
            ?? srcType === dstType);
  }

	static canLink(socket0: Socket | undefined, socket1: Socket | undefined) {
		if (!socket0 || !socket1 || socket0.isInput === socket1.isInput || socket0.node === socket1.node) return false;

    const [outSocket, inSocket] = socket1.isInput
        ? [socket0, socket1]
        : [socket1, socket0];

    return this.canLinkTypes(outSocket.type, inSocket.type);
  }


  readonly links: Link[] = [];
  
  /** Whether the connection point of the socket should be displayed */
  readonly showSocket: boolean;

  readonly desc: StringKey;
  readonly fieldText: StringKey[];
  readonly labelSubstitutions: string[];

  /** The value of the entry field input for this socket */
  fieldValue: SocketValue<St>;
  readonly showFieldIfAvailable: boolean;
  /** Semantic field that determines whether the socket should not be trusted to maintain its type (used by SocketType.Any
   * sockets to determine whether they should mock this socket's type to prevent cyclical dependencies) */
  readonly hasDynamicType: boolean;
  readonly valueChangeRequiresShaderReload: boolean;
  /** Whether the socket requests or produces a constant value */
  readonly constant: boolean;
  flags: SocketFlag;

  readonly data: SocketData<St>;

  constructor(
    /** The node this socket belongs to */
    readonly node: Node,
    readonly isInput: boolean,
    public type: St,

    public label: StringKey=NO_DESC,

    /** Object that specifies SocketType-independent options for this socket as well as SocketType-specific properties/data */
    options=<SocketOptions<St>>{},
  ) {
    const {
      showSocket,
      desc,
      fieldText,
      labelSubstitutions,
      defaultValue,
      showFieldIfAvailable,
      hasDynamicType,
      valueChangeRequiresShaderReload,
      constant,
      onValueChange,
      onLink,
      onUnlink,
      onInputTypeChange,
      onOutputTypeChange, 
      ...data
    } = options;

    this.showSocket = showSocket ?? true;
    this.desc = desc ?? NO_DESC;
    this.fieldText = fieldText ?? [];
    this.labelSubstitutions = labelSubstitutions ?? [];
    this.fieldValue = defaultValue ?? new.target.defaultValues.get(type) as SocketValue<St>,
    this.showFieldIfAvailable = showFieldIfAvailable ?? true;
    this.hasDynamicType = hasDynamicType ?? false;
    this.valueChangeRequiresShaderReload = valueChangeRequiresShaderReload ?? false;
    this.constant = constant ?? false;
    this.data = data as any as SocketData<St>;

    this.flags = SocketFlag.None;
    this.onValueChange = onValueChange ?? (() => {});
    this.onLink = onLink ?? (() => {});
    this.onUnlink = onUnlink ?? (() => {});
    this.onInputTypeChange = onInputTypeChange ?? (() => {});
    this.onOutputTypeChange = onOutputTypeChange ?? (() => {});
  }

  get isOutput() {
    return !this.isInput;
  }

  get hasLinks() {
    return this.links.length > 0;
  }
  
  flag(flags: SocketFlag) {
    this.flags = flags;
    return this;
  }

  /** Changes the type of a socket, with event handling */
  changeType<T extends SocketType>(this: Socket<T>, newType: T) {
    if (this.type === newType) return;

    this.type = newType;

    if (this.isInput) {
      this.fieldValue = Socket.defaultValues.get(newType) as SocketValue<T>;
    }

    for (const link of this.links) {
      if (this.isOutput) {
        link.dst.onInputTypeChange(newType);
      }
      if (this.isInput) {
        link.src.onOutputTypeChange(newType);
      }

      if (!Socket.canLinkTypes(link.src.type, link.dst.type)) {
        link.unlink();
      }
    }
  }

  isType<St extends SocketType>(type: St): this is Socket<St> {
    //@ts-ignore
    return this.type === type;
  }

  unlinkAllLinks() {
    for (const link of this.links) {
      link.unlink();
    }
  }

  static linkSockets(src: OutSocket, dst: InSocket) {
    if (src.isInput) throw new Error("Source is an input");
    if (dst.isOutput) throw new Error("Dest is an output");
    if (src.node === dst.node) throw new Error("Sockets belong to same node");


    const existingDstLink = dst.links[0];
    existingDstLink?.unlinkWithoutEvents();

    if (existingDstLink && src !== existingDstLink.src) {
      src.onUnlink(existingDstLink);
      dst.onInputTypeChange(src.type);
      existingDstLink.srcNode.onSocketUnlink(existingDstLink.src, existingDstLink);
    }


    const link = new Link(src, dst);

    src.links.push(link);
    dst.links.push(link);

    if (!existingDstLink) {
      dst.onLink(link);
      dst.node.onSocketLink(dst, link);
      src.onOutputTypeChange(dst.type);
      
      dst.node.onDependencyUpdate();
    }

    src.onLink(link);
    src.node.onSocketLink(src, link);
    dst.onInputTypeChange(src.type);
  }

  get usesFieldValue() {
    return false;
  }

  onValueChange() {}
  /** Called whenever a new link is attached to this socket */
  onLink(link: Link) {}
  /** Called whenever a link is removed from this socket */
  onUnlink(link: Link) {}
  /** Called whenever the type of the source socket of a link to this input socket changes, or a link is removed */
  onInputTypeChange(type: SocketType) {}
  /** Called whenever the type of the destination socket of a link to this output socket changes, or a link is removed */
  onOutputTypeChange(type: SocketType) {}
}

export class InSocket<St extends SocketType=any> extends Socket<St> {
  private readonly webglOutputMappingStatic: WebglOutputMapping<St> | null;
  readonly webglOutputMapping: () => WebglOutputMapping<St> | null;

  constructor(
    node: Node,
    type: St,

    label: StringKey,

    options=<InSocketOptions<St>>{},
  ) {
    super(node, true, type, label, options);

    const {
      webglOutputMappingStatic,
      webglOutputMapping,
    } = options;

    this.webglOutputMappingStatic = webglOutputMappingStatic ?? {};
    this.webglOutputMapping = webglOutputMapping?.(this) ?? (() => this.webglOutputMappingStatic);
  }

  get link() {
    return this.links[0];
  }

  /**
   * Provides a `WebglVariables` object that declares a uniform storing the value of this socket's field.
   * @param context 
   * @returns 
   */
  webglFieldVariables(context: NodeEvalContext={}) {
    const unif = WebglSlot.out("unif");

    switch (this.effectiveType()) {
      case SocketType.Color:
        return WebglVariables.empty({
          node: null,
          fieldOutputs: {
            [webglStdOuts.color]: WebglTemplate.source`Color(${unif}, illuminant2_D65, vec3(0., 0., 0.))`,
          },
          preludeTemplate: WebglTemplate.source`uniform vec3 ${unif};`,
          uniforms: new Map([
            [WebglTemplate.slot(unif), {
              set: (gl, unif) => {
                if (!this.usesFieldValue) {
                  gl.uniform3fv(unif, this.inValue(context) as number[]);
                } else {
                  gl.uniform3fv(unif, [0, 0, 0]);
                }
              },
              dependencySockets: [this],
              dependencyNodes: [],
            }],
          ]),
        });

      case SocketType.Vector:
        return WebglVariables.empty({
          node: null,
          fieldOutputs: {
            [webglStdOuts.vector]: WebglTemplate.slot(unif),
          },
          preludeTemplate: WebglTemplate.source`uniform vec3 ${unif};`,
          uniforms: new Map([
            [WebglTemplate.slot(unif), {
              set: (gl, unif) => {
                gl.uniform3fv(unif, this.fieldValue as number[]);
              },
              dependencySockets: [this],
              dependencyNodes: [],
            }],
          ]),
        });

      case SocketType.Float:
        return WebglVariables.empty({
          node: null,
          fieldOutputs: {
            [webglStdOuts.float]: WebglTemplate.slot(unif),
          },
          preludeTemplate: WebglTemplate.source`uniform float ${unif};`,
          uniforms: new Map([
            [WebglTemplate.slot(unif), {
              set: (gl, unif) => {
                gl.uniform1f(unif, this.fieldValue as number);
              },
              dependencySockets: [this],
              dependencyNodes: [],
            }],
          ]),
        });

      case SocketType.Integer:
        return WebglVariables.empty({
          node: null,
          fieldOutputs: {
            [webglStdOuts.integer]: WebglTemplate.slot(unif),
          },
          preludeTemplate: WebglTemplate.source`uniform int ${unif};`,
          uniforms: new Map([
            [WebglTemplate.slot(unif), {
              set: (gl, unif) => {
                gl.uniform1i(unif, this.fieldValue as number);
              },
              dependencySockets: [this],
              dependencyNodes: [],
            }],
          ]),
        });

      case SocketType.Bool:
        return WebglVariables.empty({
          node: null,
          fieldOutputs: {
            [webglStdOuts.bool]: WebglTemplate.slot(unif),
          },
          preludeTemplate: WebglTemplate.source`uniform bool ${unif};`,
          uniforms: new Map([
            [WebglTemplate.slot(unif), {
              set: (gl, unif) => {
                gl.uniform1i(unif, this.fieldValue as number);
              },
              dependencySockets: [this],
              dependencyNodes: [],
            }],
          ]),
        });

      default:
        return WebglVariables.empty({
          node: null,
          fieldOutputs: {},
        });
    }
  }

  /** Determines the effective type (specifically to filter out `SocketType.VectorOrColor`) */
  effectiveType() {
    if (this.type !== SocketType.VectorOrColor) {
      return this.type;
    }
  
    if (this.usesFieldValue) {
      return SocketType.Vector;
    }
    if (this.link.src.type === SocketType.Color) {
      return SocketType.Color;
    }
    return SocketType.Vector;
  }

  get usesFieldValue() {
    return !this.hasLinks || this.link.causesCircularDependency;
        // && this.showFieldIfAvailable;
  }

  /** Evaluates the value of this input socket (uses the value from the link attached to this socket if the link is
   * valid, or the value from the socket's field input otherwise) */
  inValue(context: NodeEvalContext={}): SocketValue<St> {
    return !this.hasLinks || this.link!.causesCircularDependency
        ? this.fieldValue
        : this.link!.src.outValueCoerced(context, this.effectiveType()) as SocketValue<St>;
  }

  delete() {
    this.unlinkAllLinks();
    this.node.ins.splice(this.node.ins.indexOf(this), 1);
  }
}

export class OutSocket<St extends SocketType=any> extends Socket<St> {
  /**
   * A group of values/slots which becomes available after evaluating the template given from
   * `this.node.webglBaseVariables`. The values from this method in particular are associated with this output
   * socket only, rather than a node's output display. Each output value is associated with a symbol (the key of the
   * `Record`) which is used to map it to a slot in another template.
   */
  readonly webglOutputs: () => WebglSocketOutputs<St>;

  constructor(
    node: Node,
    type: St,

    label: StringKey,

    readonly outValue: (context: NodeEvalContext) => SocketValue<St>,

    options=<OutSocketOptions<St>>{},
  ) {
    super(node, false, type, label, options);

    const {
      webglOutputs,
    } = options;

    this.webglOutputs = webglOutputs(this);
  }

  /** Evaluates the value of this output socket */
  /* outValue(context: NodeEvalContext={}): SocketValue<St> {
    const newContext = {
      ...context,
      socket: this,
    };

    return this.node.output(newContext);
  } */

  outValueCoerced<T extends SocketType>(context: NodeEvalContext, newType: T): SocketValue<T> {
    const outValue = this.outValue(context);

    if (this.isType(newType) || this.isType(SocketType.VectorOrColor)) {
      return outValue as unknown as SocketValue<T>;
    }

    switch (this.type) {
      case SocketType.Bool: {
        const out = outValue as SocketValue<SocketType.Bool>;
        const outNumeric = out ? 1 : 0;

        switch (newType) {
          case SocketType.Integer:
          case SocketType.Float:
            return outNumeric as SocketValue<T>;
          
          case SocketType.Vector:
            return [outNumeric, outNumeric, outNumeric] as SocketValue<T>;
  
          default:
            throw new Error(`Cannot derive output ${newType} from socket type ${this.type}`);
        }
      }

      case SocketType.Integer: {
        const out = outValue as SocketValue<SocketType.Integer>;

        switch (newType) {
          case SocketType.Float:
            return outValue as unknown as SocketValue<T>;
          
          case SocketType.Vector:
            return [out, out, out] as SocketValue<T>;
  
          default:
            throw new Error(`Cannot derive output ${newType} from socket type ${this.type}`);
        }
      }
  
      case SocketType.Float: {
        const out = outValue as SocketValue<SocketType.Float>;

        switch (newType) {
          case SocketType.Vector:
            return [out, out, out] as SocketValue<T>;
  
          default:
            throw new Error(`Cannot derive output ${newType} from socket type ${this.type}`);
        }
      }
  
      case SocketType.Color:
        switch (newType) {
          case SocketType.Vector:
            return outValue as unknown as SocketValue<T>;
  
          default:
            throw new Error(`Cannot derive output ${newType} from socket type ${this.type}`);
        }
  
      default:
        throw new Error("socket type not supported");
    }
  }

  
  /**
   * Obtains a GLSL expression that can be used to effectively coerce one socket type to another, allowing more
   * standard outputs to be accessed than what may be provided in the given `directoutputs` object.
   * @returns A proxy that provides GLSL expressions that can be evaluated to obtain the desired standard output from
   * the given socket type and `WebglSocketOutputs` object.
   */
  webglVirtualizedOutputs() {
    const socket = this;
    const directOutputs = this.webglOutputs();

    switch (this.type) {
      case SocketType.Bool:
        return new Proxy(directOutputs, {
          get(target, desiredOut, proxy) {
            if (target.hasOwnProperty(desiredOut)) {
              //@ts-ignore
              return target[desiredOut];
            }

            const out = (directOutputs as WebglSocketOutputs<SocketType.Bool>)[webglStdOuts.bool];

            switch (desiredOut) {
              case webglStdOuts.integer:
                return WebglTemplate.concat`${out} ? 1 : 0`;
      
              case webglStdOuts.float:
                return WebglTemplate.concat`${out} ? 1. : 0.`;

              case webglStdOuts.vector:
                return WebglTemplate.concat`vec3(${out} ? 1. : 0., ${out} ? 1. : 0., ${out} ? 1. : 0.)`;

              default:
                throw new Error(`Cannot derive output ${String(desiredOut)} from socket type ${socket.type}`);
            }
          }
        });

      case SocketType.Integer:
        return new Proxy(directOutputs, {
          get(target, desiredOut, proxy) {
            if (target.hasOwnProperty(desiredOut)) {
              //@ts-ignore
              return target[desiredOut];
            }

            const out = (directOutputs as WebglSocketOutputs<SocketType.Integer>)[webglStdOuts.integer];

            switch (desiredOut) {
              case webglStdOuts.float:
                return WebglTemplate.concat`float(${out})`;

              case webglStdOuts.vector:
                return WebglTemplate.concat`vec3(float(${out}), float(${out}), float(${out}))`;
      
              default:
                throw new Error(`Cannot derive output ${String(desiredOut)} from socket type ${socket.type}`);
            }
          }
        });

      case SocketType.Float:
        return new Proxy(directOutputs, {
          get(target, desiredOut, proxy) {
            if (target.hasOwnProperty(desiredOut)) {
              //@ts-ignore
              return target[desiredOut];
            }

            const out = (directOutputs as WebglSocketOutputs<SocketType.Float>)[webglStdOuts.float];

            switch (desiredOut) {
              case webglStdOuts.vector:
                return WebglTemplate.concat`vec3(${out}, ${out}, ${out})`;
      
              default:
                throw new Error(`Cannot derive output ${String(desiredOut)} from socket type ${socket.type}`);
            }
          }
        });

      case SocketType.Color:
        return new Proxy(directOutputs, {
          get(target, desiredOut, proxy) {
            if (target.hasOwnProperty(desiredOut)) {
              //@ts-ignore
              return target[desiredOut];
            }
            
            switch (desiredOut) {
              case webglStdOuts.vector:
                return WebglTemplate.concat`${(directOutputs as WebglSocketOutputs<SocketType.Color>)[webglStdOuts.color]}.components`;
      
              default:
                throw new Error(`Cannot derive output ${String(desiredOut)} from socket type ${socket.type}`);
            }
          }
        });

      default:
        return directOutputs;
    }
  }

  delete() {
    this.unlinkAllLinks();
    this.node.outs.splice(this.node.outs.indexOf(this), 1);
  }
}

export class Link {
  private static nextId = 0;
  readonly id = Link.nextId++;

  /**
   * Set in the event listener of a node.
   */
  causesCircularDependency = false;

  constructor(
    /** Source socket. */
    readonly src: OutSocket,
    /** Destination socket. */
    readonly dst: InSocket,
  ) {}

  get srcNode() {
    return this.src.node;
  }

  get dstNode() {
    return this.dst.node;
  }

  unlinkWithoutEvents() {
    this.src.links.splice(this.src.links.indexOf(this), 1);
    this.dst.links.splice(this.dst.links.indexOf(this), 1);
  }

  unlink() {
    this.unlinkWithoutEvents();

    this.src.onUnlink(this);
    this.srcNode.onSocketUnlink(this.src, this);

    this.dst.onUnlink(this);
    this.dstNode.onSocketUnlink(this.dst, this);
    
    this.dstNode.onDependencyUpdate();
  }
}


export class Field {
  private static nextId = 0;
  readonly id = Field.nextId++;

  value = 0;

  constructor(
    public label: StringKey=NO_DESC,
  ) {}
}

enum NodeUpdateSourceType {
  TreeChange,
  InSocket,
  NodeSpecialInput,
}
type NodeUpdateSourceValue<T extends NodeUpdateSourceType> =
    T extends NodeUpdateSourceType.TreeChange ? null :
    T extends NodeUpdateSourceType.InSocket ? InSocket :
    T extends NodeUpdateSourceType.NodeSpecialInput ? Node :
    never;

export class NodeUpdateSource<T extends NodeUpdateSourceType=any> {
  private constructor(
    private type: T,
    public source: NodeUpdateSourceValue<T>,
  ) {}

  static readonly TreeReload = new NodeUpdateSource(NodeUpdateSourceType.TreeChange, null);

  static NodeSpecialInput(node: Node) {
    return new NodeUpdateSource(NodeUpdateSourceType.NodeSpecialInput, node);
  }

  static InSocket(socket: InSocket) {
    return new NodeUpdateSource(NodeUpdateSourceType.InSocket, socket);
  }

  isTreeReload(): this is NodeUpdateSource<NodeUpdateSourceType.TreeChange> {
    return this.type === NodeUpdateSourceType.TreeChange;
  }

  isSocket(): this is NodeUpdateSource<NodeUpdateSourceType.InSocket> {
    return this.type === NodeUpdateSourceType.InSocket;
  }

  isNode(): this is NodeUpdateSource<NodeUpdateSourceType.NodeSpecialInput> {
    return this.type === NodeUpdateSourceType.NodeSpecialInput;
  }

  get socket(): Option<InSocket> {
    return this.isSocket() ? Option.Some(this.source) : Option.None;
  }

  get node(): Option<Node> {
    return this.isNode() ? Option.Some(this.source) : Option.None;
  }

  srcNode(): Option<Node> {
    if (this.isNode()) {
      return Option.Some(this.source);
    } else if (this.isSocket()) {
      return Option.Some(this.source.node);
    }
    return Option.None;
  }
}
enum NodeOutputTargetType {
  OutSocket,
  NodeDisplay,
  Field,
}
type NodeOutputTargetValue<T extends NodeOutputTargetType> =
    T extends NodeOutputTargetType.OutSocket ? OutSocket :
    T extends NodeOutputTargetType.NodeDisplay ? Node :
    T extends NodeOutputTargetType.Field ? null :
    never;

export class NodeOutputTarget<T extends NodeOutputTargetType=any> {
  private constructor(
    private type: T,
    readonly target: NodeOutputTargetValue<T>,
  ) {}

  static OutSocket(socket: OutSocket) {
    return new NodeOutputTarget(NodeOutputTargetType.OutSocket, socket);
  }

  static NodeDisplay(node: Node) {
    return new NodeOutputTarget(NodeOutputTargetType.NodeDisplay, node);
  }

  static readonly Field = new NodeOutputTarget(NodeOutputTargetType.Field, null);

  isSocket(): this is NodeOutputTarget<NodeOutputTargetType.OutSocket> {
    return this.type === NodeOutputTargetType.OutSocket;
  }

  isNode(): this is NodeOutputTarget<NodeOutputTargetType.NodeDisplay> {
    return this.type === NodeOutputTargetType.NodeDisplay;
  }

  get socket(): Option<OutSocket> {
    return this.isSocket() ? Option.Some(this.target) : Option.None;
  }

  get node(): Option<Node> {
    return this.isNode() ? Option.Some(this.target) : Option.None;
  }

  match<T>({onSocket, onNode, onField}: {onSocket: (socket: OutSocket) => T, onNode: (node: Node) => T, onField: () => T}) {
    switch (this.type) {
      case NodeOutputTargetType.OutSocket:
        return onSocket((this as NodeOutputTarget<NodeOutputTargetType.OutSocket>).target);

      case NodeOutputTargetType.NodeDisplay:
        return onNode((this as NodeOutputTarget<NodeOutputTargetType.NodeDisplay>).target);

      case NodeOutputTargetType.Field:
        return onField();

      default:
        throw new Error("unknown type");
    }
  }
}