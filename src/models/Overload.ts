import { WebglVariables } from "@/webgl-compute/WebglVariables";
import { InSocket, Node, NodeDisplay, NodeEvalContext, OutSocket, Socket, SocketType, SocketType as St, Tree, WebglSocketValue } from "./Node";

/** A collection of input/output sockets, as well as a function to compute outputs from the inputs' values */
export class Overload<OutputType, NodeType extends Node=any, InSockets extends InSocket[]=any, OutSockets extends OutSocket[]=any> {
  constructor(
    readonly label: string,
    readonly ins: (node: NodeType) => [...InSockets],
    readonly outs: (node: NodeType, ins: InSockets) => [...OutSockets],
    readonly nodeDisplay: (ins: InSockets, outs: OutSockets, context: NodeEvalContext, node: NodeType) => NodeDisplay=() => { throw new Error("not implemented") },
    readonly webglGetBaseVariables: (ins: InSockets, outs: OutSockets, context: NodeEvalContext, node: NodeType) => WebglVariables=() => { throw new Error("not implemented"); },
    readonly webglGetMapping: <T extends St>(inSocket: InSocket<T>, ins: InSockets, node: NodeType) => WebglSocketValue<T> | null=() => { throw new Error("not implemented"); },
    private readonly maintainExistingLinks = false,
  ) {}
}

/** Descriptor of a set of overloads, usually to store those specific to a certain subclass of Node */
export class OverloadGroup<Mode extends string, NodeType extends Node=any> {
  constructor(
    private readonly modes: Map<Mode, Overload<any, NodeType>>,
  ) {}

  buildDropdown(node: NodeType, defaultMode: Mode, overloadManager: OverloadManager<Mode>) {
    return new InSocket(node, Socket.Type.Dropdown, "", {
      showSocket: false,
      options: [...this.modes].map(([mode, overload]) => (
        {value: mode, text: overload.label}
      )),
      defaultValue: defaultMode,
      onValueChange: tree => overloadManager.handleModeChange(tree),
    });
  }

  getOverload(mode: Mode) {
    return this.modes.get(mode)!;
  }
}

/** Stores the currently selected overload of a Node instance, as well as obtains the current output evaluation
 * function when needed and updates the sockets when the selected overload changes
 */
export class OverloadManager<Mode extends string> {
  readonly dropdown: InSocket<St.Dropdown>;
  private ins: InSocket[];
  private outs: OutSocket[];

  constructor(
    private readonly node: Node,
    defaultMode: Mode,
    private readonly overloadGroup: OverloadGroup<Mode>,
  ) {
    this.dropdown = overloadGroup.buildDropdown(node, defaultMode, this);

    const overload = overloadGroup.getOverload(defaultMode);
    this.ins = overload.ins(node);
    this.outs = overload.outs(node, this.ins);
  }

  setSockets() {
    this.node.ins.push(this.dropdown);
    this.node.ins.push(...this.ins);
    this.node.outs.push(...this.outs);
  }

  nodeDisplay(context: NodeEvalContext) {
    return this.overload.nodeDisplay(this.ins, this.outs, context, this.node);
  }

  webglGetBaseVariables(context: NodeEvalContext) {
    return this.overload.webglGetBaseVariables(this.ins, this.outs, context, this.node);
  }

  webglGetMapping(inSocket: InSocket) {
    return this.overload.webglGetMapping(inSocket, this.ins, this.node);
  }

  handleModeChange(tree: Tree) {
    /* 
    const deleteSocketsUntilLength = (targetLength: number) => {
      while (this.valueSockets.length > targetLength) {
        this.ins.pop();
        const oldSocket = this.valueSockets.pop();
        oldSocket?.links.forEach(link => tree.unlink(link));
      }
    };
    */

    const nIns = this.ins.length;
    const nOuts = this.outs.length;
    for (let i = 0; i < nIns; i++) {
      const oldSocket = this.node.ins.pop();
      oldSocket?.links.forEach(link => tree.unlink(link));
    }

    for (let i = 0; i < nOuts; i++) {
      const oldSocket = this.node.outs.pop();
      oldSocket?.links.forEach(link => tree.unlink(link));
    }

    this.ins = this.overload.ins(this.node);
    this.outs = this.overload.outs(this.node, this.ins);
    this.node.ins.push(...this.ins);
    this.node.outs.push(...this.outs);
  }

  get mode() {
    return this.dropdown.inValue() as Mode;
  }

  get overload() {
    return this.overloadGroup.getOverload(this.mode);
  }
}

export abstract class NodeWithOverloads<Mode extends string> extends Node {
  static readonly overloadGroup: OverloadGroup<any>;

  readonly overloadManager: OverloadManager<Mode>;

  constructor(defaultMode: Mode) {
    super();
    this.overloadManager = new OverloadManager(this, defaultMode, new.target.overloadGroup);
    this.overloadManager.setSockets();
  }

  display(context: NodeEvalContext): NodeDisplay {
    return this.overloadManager.nodeDisplay(context);
  }

  webglGetBaseVariables(context: NodeEvalContext={}) {
    return this.overloadManager.webglGetBaseVariables(context);
  }

  webglGetMapping<St extends SocketType>(inSocket: InSocket<St>) {
    return this.overloadManager.webglGetMapping(inSocket) as WebglSocketValue<St>;
  }
}