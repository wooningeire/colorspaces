import { NO_DESC, StringKey } from "@/strings";
import { Node, SocketType, NodeEvalContext, InSocket, OutSocket, webglStdOuts, InSocketOptions, socketTypeToStdOut, OutSocketOptions } from "../Node";

import { useDynamicallyTypedSockets } from "./util";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";
import { NodeWithOverloads, Overload, OverloadGroup } from "../Overload";

export namespace organization {
  export class RerouteNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "reroute";

    width = 15;

    private static readonly inputSlots = WebglSlot.ins("val");
    
    constructor() {
      super();
      
      const {val} = RerouteNode.inputSlots;

      const dynamicTyping = useDynamicallyTypedSockets(
        () => [this.ins[0]],
        () => [this.outs[0]],
      );

      this.ins.push(
        new InSocket(this, SocketType.DynamicAny, NO_DESC, {
          ...dynamicTyping.inSocketOptions(val),
        })
      );

      this.outs.push(
        new OutSocket(this, SocketType.DynamicAny, NO_DESC, context => this.ins[0].inValue(context), {
          ...dynamicTyping.outSocketOptions(WebglTemplate.slot(val)),
        }),
      );
    }

    /*
    onSocketLink(socket: Socket, link: Link, tree: Tree) {
      super.onSocketLink(socket, link, tree);

      if (socket.isOutput) return;
      const type = link.src.type;
      this.ins[0].type = type;

      this.outs.push(new OutSocket(this, type, ""));
    }

    onSocketUnlink(socket: Socket, link: Link, tree: Tree) {
      super.onSocketUnlink(socket, link, tree);

      if (socket.isOutput) return;

      this.outs[0].links.forEach(link => tree.unlink(link));
      this.outs.pop();
      this.ins[0].type = SocketType.Any;
    }
    */
  }
  

  enum ValueOverloadMode {
    Vector = "vector",
    Float = "float",
    Integer = "integer",
    Bool = "bool",
  }

  export class ValueNode extends NodeWithOverloads<ValueOverloadMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "value";

    private static readonly inputSlots = WebglSlot.ins("val");

    width = 100;

    private static readonly typeOverload = (<St extends SocketType>() => {
      const {val} = this.inputSlots;

      return ({
        label,
        outputLabel,
        type,
        inSocketOptions=<InSocketOptions<St>>{},
      }: {
        label: StringKey,
        outputLabel: StringKey,
        type: St,
        inSocketOptions?: InSocketOptions<St>,
      }) => new Overload(
        label,
        node => [
          new InSocket(node, type, NO_DESC, {
            ...inSocketOptions,
            webglOutputMapping: {[socketTypeToStdOut.get(type)!]: val},
          }),
        ],
        (node, ins) => [
          new OutSocket(node, type, outputLabel, context => ins[0].inValue(context), <OutSocketOptions<St>>{
            webglOutputs: socket => () => ({[socketTypeToStdOut.get(type)!]: WebglTemplate.slot(val)}),
          }),
        ],
        (ins, outs, context, node) => ({
          values: [],
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => WebglVariables.empty({node}),
      );
    })();

    static readonly overloadGroup = new OverloadGroup(new Map<ValueOverloadMode, Overload>([
      [ValueOverloadMode.Vector, this.typeOverload({
        label: "label.socketType.vector",
        outputLabel: "label.socket.vector",
        type: SocketType.Vector,
        inSocketOptions: {
          sliderProps: [
            {
              hasBounds: false,
            },
            {
              hasBounds: false,
            },
            {
              hasBounds: false,
            },
          ],
        },
      })],

      [ValueOverloadMode.Float, this.typeOverload({
        label: "label.socketType.float",
        outputLabel: "label.socket.value",
        type: SocketType.Float,
        inSocketOptions: {
          sliderProps: {
            hasBounds: false,
          },
        },
      })],

      [ValueOverloadMode.Integer, this.typeOverload({
        label: "label.socketType.integer",
        outputLabel: "label.socket.value",
        type: SocketType.Integer,
        inSocketOptions: {
          sliderProps: {
            hasBounds: false,
          },
        },
      })],

      [ValueOverloadMode.Bool, this.typeOverload({
        label: "label.socketType.bool",
        outputLabel: "label.socket.value",
        type: SocketType.Bool,
      })],
    ]));

    constructor() {
      super(ValueOverloadMode.Float);
    }
  }
}