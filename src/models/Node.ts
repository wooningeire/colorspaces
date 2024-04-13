import { WebglVariables } from "@/webgl-compute/WebglVariables";
import { StringKey } from "../strings";
import { Vec2, Vec3 } from "../util";
import { OverloadGroup, OverloadManager } from "./Overload";
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

  /** Constructs a `WebglVariables` object, where slots that can be filled by its socket field values have been filled
   * 
  */
  webglOutput(context: NodeEvalContext={}): WebglVariables {
    let variables = this.webglGetBaseVariables();
    for (const inSocket of this.ins) {
      if (!inSocket.usesFieldValue) continue;

      const mapping = this.webglGetMapping(inSocket);
      if (mapping === null) continue;

      variables = variables.fillWith(inSocket.webglVariables(), null, mapping, true);
    }
    return variables;
  }
  /** Fills the slots of a target `WebglVariables` with the output of a source `WebglVariables`, whose output variables
   * are mapped to target slots according to `webglGetMapping(inSocket)`
   */
  webglVariablesFill(source: WebglVariables, target: WebglVariables, inSocket: InSocket): WebglVariables {
    const mapping = this.webglGetMapping(inSocket);
    if (mapping === null) throw new Error("the implementation of webglGetMapping for this node does not support this socket");
    return target.fillWith(source, inSocket?.link.src, mapping);
  }

  /** A `WebglVariables` object that provides a template to fill, output variables, and uniforms */
  webglGetBaseVariables(): WebglVariables {
    throw new Error("not implmeneted");
  }
  /** Provides a mapping from output names from a source socket to input slot names in `webglGetBaseVariables`
   * depending on which input socket `inSocket` we are inspecting
   */
  webglGetMapping<St extends SocketType>(inSocket: InSocket<St>): WebglSocketValue<St> | null {
    throw new Error("not implmeneted");
  }

  display(context: NodeEvalContext): NodeDisplay {
    return {
      values: [],
      labels: [],
      flags: [],
    }
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

    this.forEachInLink(link => {
      if (link.causesCircularDependency) return;
      for (const axis of link.srcNode.getDependencyAxes()) {
        axes.add(axis);
      }
    });
    return axes;
  }

  forEachInLink(fn: (link: Link) => void) {
    for (const socket of this.ins) {
      for (const link of socket.links) {
        fn(link);
      }
    }
  }
}

export interface AxisNode extends Node {
  readonly axes: number[];
}

export interface NodeEvalContext {
  readonly coords?: Vec2;
}

export type NodeOutputTarget = OutSocket | null;


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
const St = SocketType;

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

export type WebglSocketValue<St extends SocketType=any> = (
  St extends SocketType.Float ? {
    "val": string,
  } :
  St extends SocketType.Integer ? WebglSocketValue<SocketType.Float> :
  St extends SocketType.Vector ? WebglSocketValue<SocketType.Float> :
  St extends SocketType.ColorCoords ? {
    "val": string,
    "illuminant": string,
    "xyz": string,
  } :
  St extends SocketType.VectorOrColor ? WebglSocketValue<SocketType.ColorCoords> | WebglSocketValue<SocketType.Vector> :
  St extends SocketType.Dropdown ? never :
  St extends SocketType.Image ? never :
  St extends SocketType.Bool ? WebglSocketValue<SocketType.Float> :
  never
);

export enum SocketFlag {
  None = 0,
  Rgb = 1 << 0,
  Hue = 1 << 1,
}

export type SliderProps = {
  hasBounds?: boolean,
  min?: number,
  max?: number,
  step?: number,
  unboundedChangePerPixel?: number,
};

/** Properties specific to the socket type */
type SocketData<St extends SocketType=any> =
    {
      socketDesc?: StringKey,
      fieldText?: StringKey[],
    } &
    (St extends SocketType.Dropdown ? {
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
    {});


export type SocketOptions<St extends SocketType=any> =
    {
      defaultValue?: SocketValue<St>,
      hasVolatileType?: boolean,
      showFieldIfAvailable?: boolean,
      valueChangeRequiresShaderReload?: boolean,
      onValueChange?: (this: Socket<St>, tree: Tree) => void,
      onLink?: (this: Socket<St>, link: Link, tree: Tree) => void,
      onUnlink?: (this: Socket<St>, link: Link, tree: Tree) => void,
      onInputTypeChange?: (this: Socket<St>, type: SocketType, tree: Tree) => void,
      onOutputTypeChange?: (this: Socket<St>, type: SocketType, tree: Tree) => void,
    } & SocketData<St>;

export abstract class Socket<St extends SocketType=any> {
  private static nextId = 0;
  readonly id = Socket.nextId++;

  static readonly Type = SocketType;
  private static readonly defaultValues = new Map<SocketType, SocketValue>([
    [St.Float, 0],
    [St.Vector, [0, 0, 0]],
    [St.VectorOrColor, [0, 0, 0]],
  ]);

  /** Specifies what destination socket types a source socket type can be linked to, if it cannot be determined
   * automatically */
  private static readonly typeCanBeLinkedTo = new Map<SocketType, SocketType[]>([
    [St.Vector, [St.Vector, St.VectorOrColor]],
    [St.ColorCoords, [St.ColorCoords, St.VectorOrColor, St.Vector]],
  ]);

  /** Checks if a source socket type can be linked to a destination socket type */
  static canLinkTypes(srcType: SocketType, dstType: SocketType) {
    return dstType === St.Any
        || srcType === St.Any
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

  /** The value of the entry field input for this socket */
  fieldValue: SocketValue<St>;
  readonly showFieldIfAvailable: boolean;
  /** Semantic field that determines whether the socket should not be trusted to maintain its type (used by St.Any
   * sockets to determine whether they should mock this socket's type to prevent cyclical dependencies) */
  readonly hasVolatileType: boolean;
  readonly valueChangeRequiresShaderReload: boolean;
  flags: SocketFlag;

  readonly data: SocketData<St>;

  constructor(
    /** The node this socket belongs to */
    readonly node: Node,
    readonly isInput: boolean,
    public type: St,

    public label: string="",

    readonly showSocket: boolean=true,

    /** Object that specifies SocketType-independent options for this socket as well as SocketType-specific properties/data */
    options=<SocketOptions<St>>{},
  ) {
    const {
      defaultValue,
      showFieldIfAvailable,
      hasVolatileType,
      valueChangeRequiresShaderReload,
      onValueChange,
      onLink,
      onUnlink,
      onInputTypeChange,
      onOutputTypeChange, 
      ...data
    } = options;

    this.fieldValue = defaultValue ?? new.target.defaultValues.get(type) as SocketValue<St>,
    this.showFieldIfAvailable = showFieldIfAvailable ?? true;
    this.hasVolatileType = hasVolatileType ?? false;
    this.valueChangeRequiresShaderReload = valueChangeRequiresShaderReload ?? false;
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
  constructor(
    node: Node,
    type: St,

    public label: string="",

    readonly showSocket: boolean=true,

    options=<SocketOptions<St>>{},
  ) {
    super(node, true, type, label, showSocket, options);
  }

  get link() {
    return this.links[0];
  }

  webglVariables(context: NodeEvalContext={}): WebglVariables {
    return !this.usesFieldValue
        ? this.link.srcNode.webglOutput(context)
        : this.webglFieldVariables(context);
  }

  private webglFieldVariables(context: NodeEvalContext={}) {
    switch (this.effectiveType()) {
      case St.ColorCoords:
        return new WebglVariables(
          "",
          new Map([
            [null, {
              "val": "{0:unif}",
              "illuminant": "illuminant2_D65",
              "xyz": "vec3(0., 0., 0.)",
            }]
          ]),
          `uniform vec3 {0:unif};`,
          {
            "{0:unif}": {
              set: (gl, unif) => {
                if (!this.usesFieldValue) {
                  gl.uniform3fv(unif, this.inValue(context) as number[]);
                } else {
                  gl.uniform3fv(unif, [0, 0, 0]);
                }
              },
              dependencySockets: [this],
            },
          },
        ).nameVariableSlots(1);

      case St.Vector:
        return new WebglVariables(
          "",
          new Map([
            [null, {
              "val": `{0:unif}`,
            }],
          ]),
          `uniform vec3 {0:unif};`,
          {
            "{0:unif}": {
              set: (gl, unif) => {
                gl.uniform3fv(unif, this.fieldValue as number[]);
              },
              dependencySockets: [this],
            },
          },
        ).nameVariableSlots(1);

      case St.Float:
        return new WebglVariables(
          "",
          new Map([
            [null, {
              "val": "{0:unif}",
            }],
          ]),
          `uniform float {0:unif};`,
          {
            "{0:unif}": {
              set: (gl, unif) => {
                gl.uniform1f(unif, this.fieldValue as number);
              },
              dependencySockets: [this],
            },
          },
        ).nameVariableSlots(1);

        case St.Bool:
          return new WebglVariables(
            "",
            new Map([
              [null, {
                "val": "{0:unif}",
              }],
            ]),
            `uniform bool {0:unif};`,
            {
              "{0:unif}": {
                set: (gl, unif) => {
                  gl.uniform1i(unif, this.fieldValue as number);
                },
                dependencySockets: [this],
              },
            },
          ).nameVariableSlots(1);

      default:
        throw new Error("not implemented");
    }
  }

  /** Determines the effective type (specifically to filter out `St.VectorOrColor`) */
  effectiveType() {
    if (this.type !== St.VectorOrColor) {
      return this.type;
    }
  
    if (this.usesFieldValue || this.link.src.type === St.VectorOrColor) {
      return St.Vector;
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
  constructor(
    node: Node,
    type: St,

    public label: string="",

    readonly outValue: (context: NodeEvalContext) => SocketValue<St>,

    readonly showSocket: boolean=true,

    options=<SocketOptions<St>>{},
  ) {
    super(node, false, type, label, showSocket, options);
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