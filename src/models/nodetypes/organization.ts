import { NO_DESC } from "@/strings";
import { Node, SocketType, NodeEvalContext, InSocket, OutSocket } from "../Node";

import { useDynamicallyTypedSockets } from "./util";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";

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
    
    webglBaseVariables(context?: NodeEvalContext): WebglVariables {
      return WebglVariables.empty({node: this});
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
}