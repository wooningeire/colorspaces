import { WebglOutputs, WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";
import { NO_DESC, StringKey } from "../strings";
import { Vec2, Vec3, Option } from "../util";
import { Col } from "./colormanagement";

export class Tree {
  readonly links = new Set<Link>();
  readonly nodes = new Set<Node>();

  linkSockets(src: OutSocket, dst: InSocket) {
    if (src.isInput) throw new Error("Source is an input");
    if (dst.isOutput) throw new Error("Dest is an output");
    if (src.node === dst.node) throw new Error("Sockets belong to same node");


    const existingDstLink = dst.links[0];
    if (existingDstLink) {
      this.unlinkWithoutEvents(existingDstLink);
    }

    if (existingDstLink && src !== existingDstLink.src) {
      src.onUnlink(existingDstLink, this);
      dst.onInputTypeChange(src.type, this);
      existingDstLink.srcNode.onSocketUnlink(existingDstLink.src, existingDstLink, this);
    }


    const link = new Link(src, dst);

    src.links.push(link);
    dst.links.push(link);

    this.links.add(link);

    if (!existingDstLink) {
      dst.onLink(link, this);
      dst.node.onSocketLink(dst, link, this);
      src.onOutputTypeChange(dst.type, this);
      
      dst.node.onDependencyUpdate();
    }

    src.onLink(link, this);
    src.node.onSocketLink(src, link, this);
    dst.onInputTypeChange(src.type, this);
  }

  private unlinkWithoutEvents(link: Link) {
    this.links.delete(link);
    link.src.links.splice(link.src.links.indexOf(link), 1);
    link.dst.links.splice(link.dst.links.indexOf(link), 1);
  }

  unlink(link: Link) {
    this.unlinkWithoutEvents(link);

    link.src.onUnlink(link, this);
    link.srcNode.onSocketUnlink(link.src, link, this);

    link.dst.onUnlink(link, this);
    link.dstNode.onSocketUnlink(link.dst, link, this);
    
    link.dstNode.onDependencyUpdate();
  }

  deleteNode(node: Node) {
    this.nodes.delete(node);

    [...node.ins, ...node.outs]
        .map(socket => socket.links)
        .flat()
        .forEach(link => this.unlink(link));
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
  labels: string[],
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
  canMove = true;
  canEditLinks = true;
  pos: Vec2 = [0, 0];
  setPos(pos: Vec2) { this.pos = pos; return this; }

  // Note: If subclass constructor is called, `new.target` is the subclass
  constructor(
    readonly type: symbol=new.target.TYPE,
    readonly label: StringKey | string=new.target.LABEL,
  ) {}

  /** A `WebglVariables` object that provides a template to fill, output variables, and uniforms */
  webglBaseVariables(): WebglVariables {
    throw new Error("not implmeneted");
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
  onSocketLink(socket: Socket, link: Link, tree: Tree) {
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
  onSocketUnlink(socket: Socket, link: Link, tree: Tree) {
    this.markCyclicalLinks();
  }

  onSocketFieldValueChange(socket: Socket, tree: Tree) {
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
        if (link.causesCircularDependency) continue;
        
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
  Any,
  Float,
  Integer,
  Vector,
  VectorOrColor,
  ColorCoords,
  Dropdown,
  Image,
  Bool,
}
export type SocketValue<St extends SocketType=any> =
    St extends SocketType.Float ? number :
    St extends SocketType.Integer ? number :
    St extends SocketType.Vector ? Vec3 :
    St extends SocketType.ColorCoords ? Col :
    St extends SocketType.VectorOrColor ? Vec3 :
    St extends SocketType.Dropdown ? string :
    St extends SocketType.Image ? ImageData :
    St extends SocketType.Bool ? boolean :
    St extends SocketType.Any ? any :
    never;

/** In ascending order */
const socketTypesByRestrictiveness = [
  [SocketType.Any],
  [SocketType.VectorOrColor],
  [SocketType.Float, SocketType.Bool, SocketType.Integer, SocketType.Vector, SocketType.ColorCoords],
];

export const socketTypeRestrictiveness = new Map<SocketType, number>(
  socketTypesByRestrictiveness.flatMap((types, i) => types.map(type => [type, i])),
);


export const webglOuts = Object.freeze({
  val: Symbol("val"),
  illuminant: Symbol("illuminant"),
  xyz: Symbol("xyz"),
  alpha: Symbol("alpha"),
}) as unknown as {
  readonly val: unique symbol,
  readonly illuminant: unique symbol,
  readonly xyz: unique symbol,
  readonly alpha: unique symbol,
};

export type WebglSocketOutputMapping<St extends SocketType=any> = Partial<
  St extends SocketType.Float ? {
    [webglOuts.val]: WebglSlot,
  } :
  St extends SocketType.Integer ? WebglSocketOutputMapping<SocketType.Float> :
  St extends SocketType.Vector ? WebglSocketOutputMapping<SocketType.Float> :
  St extends SocketType.ColorCoords ? {
    [webglOuts.val]: WebglSlot,
    [webglOuts.illuminant]: WebglSlot,
    [webglOuts.xyz]: WebglSlot,
  } :
  St extends SocketType.VectorOrColor ? WebglSocketOutputMapping<SocketType.ColorCoords> | WebglSocketOutputMapping<SocketType.Vector> :
  St extends SocketType.Dropdown ? never :
  St extends SocketType.Image ? never :
  St extends SocketType.Bool ? WebglSocketOutputMapping<SocketType.Float> :
  never
>;

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
        text: string,
      }[],
    } :
    St extends SocketType.Float ? {
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
  socketDesc?: StringKey,
  fieldText?: StringKey[],
  defaultValue?: SocketValue<St>,
  hasDynamicType?: boolean,
  showFieldIfAvailable?: boolean,
  valueChangeRequiresShaderReload?: boolean,
  constant?: boolean,
  onValueChange?: (this: Socket<St>, tree: Tree) => void,
  onLink?: (this: Socket<St>, link: Link, tree: Tree) => void,
  onUnlink?: (this: Socket<St>, link: Link, tree: Tree) => void,
  onInputTypeChange?: (this: Socket<St>, type: SocketType, tree: Tree) => void,
  onOutputTypeChange?: (this: Socket<St>, type: SocketType, tree: Tree) => void,
} & SocketData<St>;
export type InSocketOptions<St extends SocketType=any> = {
  /** A mapping from output names from an incoming source socket (that is linked to this socket) to input slots in
   * `webglBaseVariables`
   */
  webglOutputMapping?: WebglSocketOutputMapping<St> | null,
  webglGetOutputMapping?: (socket: InSocket<St>) => () => WebglSocketOutputMapping<St> | null,
} & SocketOptions<St>;
export type OutSocketOptions<St extends SocketType=any> = {
  webglOutputs?: (socket: OutSocket) => () => WebglOutputs,
} & SocketOptions<St>;

export abstract class Socket<St extends SocketType=any> {
  private static nextId = 0;
  readonly id = Socket.nextId++;

  private static readonly defaultValues = new Map<SocketType, SocketValue>([
    [SocketType.Float, 0],
    [SocketType.Vector, [0, 0, 0]],
    [SocketType.VectorOrColor, [0, 0, 0]],
  ]);

  /** Specifies what destination socket types a source socket type can be linked to, if it cannot be determined
   * automatically */
  private static readonly typeCanBeLinkedTo = new Map<SocketType, SocketType[]>([
    [SocketType.Vector, [SocketType.Vector, SocketType.VectorOrColor]],
    [SocketType.ColorCoords, [SocketType.ColorCoords, SocketType.VectorOrColor, SocketType.Vector]],
  ]);

  /** Checks if a source socket type can be linked to a destination socket type */
  static canLinkTypes(srcType: SocketType, dstType: SocketType) {
    return dstType === SocketType.Any
        || srcType === SocketType.Any
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

  readonly socketDesc: StringKey;
  readonly fieldText: StringKey[];

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

    public label: string="",

    /** Object that specifies SocketType-independent options for this socket as well as SocketType-specific properties/data */
    options=<SocketOptions<St>>{},
  ) {
    const {
      showSocket,
      socketDesc,
      fieldText,
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
    this.socketDesc = socketDesc ?? NO_DESC;
    this.fieldText = fieldText ?? [];
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
  changeType<T extends SocketType>(this: Socket<T>, newType: T, tree: Tree) {
    if (this.type === newType) return;

    this.type = newType;

    if (this.isInput) {
      this.fieldValue = Socket.defaultValues.get(newType) as SocketValue<T>;
    }

    for (const link of this.links) {
      if (this.isOutput) {
        link.dst.onInputTypeChange(newType, tree);
      }
      if (this.isInput) {
        link.src.onOutputTypeChange(newType, tree);
      }

      if (!Socket.canLinkTypes(link.src.type, link.dst.type)) {
        tree.unlink(link);
      }
    }
  }

  isType<T extends SocketType>(type: T): this is Socket<T> {
    //@ts-ignore
    return this.type === type;
  }

  removeAllLinks(tree: Tree) {
    for (const link of this.links) {
      tree.unlink(link);
    }
  }

  get usesFieldValue() {
    return false;
  }

  onValueChange(tree: Tree) {}
  /** Called whenever a new link is attached to this socket */
  onLink(link: Link, tree: Tree) {}
  /** Called whenever a link is removed from this socket */
  onUnlink(link: Link, tree: Tree) {}
  /** Called whenever the type of the source socket of a link to this input socket changes, or a link is removed */
  onInputTypeChange(type: SocketType, tree: Tree) {}
  /** Called whenever the type of the destination socket of a link to this output socket changes, or a link is removed */
  onOutputTypeChange(type: SocketType, tree: Tree) {}
}

export class InSocket<St extends SocketType=any> extends Socket<St> {
  private readonly webglOutputMapping: WebglSocketOutputMapping<St> | null;
  readonly webglGetOutputMapping: () => WebglSocketOutputMapping<St> | null;

  constructor(
    node: Node,
    type: St,

    public label: string="",

    options=<InSocketOptions<St>>{},
  ) {
    super(node, true, type, label, options);

    const {
      webglOutputMapping,
      webglGetOutputMapping,
    } = options;

    this.webglOutputMapping = webglOutputMapping ?? null;
    this.webglGetOutputMapping = webglGetOutputMapping?.(this) ?? (() => this.webglOutputMapping);
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
      case SocketType.ColorCoords:
        return WebglVariables.empty({
          node: null,
          fieldOutputs: {
            [webglOuts.val]: WebglTemplate.slot(unif),
            [webglOuts.illuminant]: WebglTemplate.string("illuminant2_D65"),
            [webglOuts.xyz]: WebglTemplate.string("vec3(0., 0., 0.)"),
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
            [webglOuts.val]: WebglTemplate.slot(unif),
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
            [webglOuts.val]: WebglTemplate.slot(unif),
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

        case SocketType.Bool:
          return WebglVariables.empty({
            node: null,
            fieldOutputs: {
              [webglOuts.val]: WebglTemplate.slot(unif),
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
        throw new Error("not implemented");
    }
  }

  /** Determines the effective type (specifically to filter out `SocketType.VectorOrColor`) */
  effectiveType() {
    if (this.type !== SocketType.VectorOrColor) {
      return this.type;
    }
  
    if (this.usesFieldValue || this.link.src.type === SocketType.VectorOrColor) {
      return SocketType.Vector;
    }
    return this.link.src.type;
  }

  get usesFieldValue() {
    return !this.hasLinks || this.link.causesCircularDependency;
        // && this.showFieldIfAvailable;
  }

  /** Evaluates the value of this input socket (uses the value from the link attached to this socket if the link is
   * valid, or the value from the socket's field input otherwise) */
  inValue(context: NodeEvalContext={}): SocketValue<St> {
    return this.link?.causesCircularDependency
        ? this.fieldValue
        : (this.link?.src.outValue(context) as SocketValue<St>) ?? this.fieldValue;
  }
}

export class OutSocket<St extends SocketType=any> extends Socket<St> {
  /**
   * A group of values/slots which becomes available after evaluating the template given from
   * `this.node.webglBaseVariables`. The values from this method in particular are associated with this output
   * socket only, rather than a node's output display. Each output value is associated with a symbol (the key of the
   * `Record`) which is used to map it to a slot in another template.
   */
  readonly webglOutputs: () => WebglOutputs;

  constructor(
    node: Node,
    type: St,

    public label: string="",

    readonly outValue: (context: NodeEvalContext) => SocketValue<St>,

    options=<OutSocketOptions<St>>{},
  ) {
    super(node, false, type, label, options);

    const {
      webglOutputs,
    } = options;

    this.webglOutputs = webglOutputs?.(this) ?? (() => ({}));
  }

  /** Evaluates the value of this output socket */
  /* outValue(context: NodeEvalContext={}): SocketValue<St> {
    const newContext = {
      ...context,
      socket: this,
    };

    return this.node.output(newContext);
  } */
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
}


export class Field {
  private static nextId = 0;
  readonly id = Field.nextId++;

  value = 0;

  constructor(
    public label: string="",
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