import {Tree, Node, Socket, SocketType as St, Link, NodeEvalContext, InSocket, OutSocket, WebglSocketValue} from "../Node";

import {Vec2} from "@/util";
import { volatileInSocketOptions, volatileOutSocketOptions } from "./util";
import { WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace organization {
  export class RerouteNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Reroute";
    
    constructor() {
      super();

      this.ins.push(
        new InSocket(this, St.Any, "", true, volatileInSocketOptions(this.ins, this.outs)),
      );

      this.outs.push(
        new OutSocket(this, St.Any, "", true, volatileOutSocketOptions(this.ins, this.outs)),
      );

      this.width = 15;
    }

    output(context: NodeEvalContext) {
      return this.ins[0].inValue(context);
    }
    
    webglGetBaseVariables(context?: NodeEvalContext): WebglVariables {
      let outVars: WebglSocketValue<(typeof this.outs[0])["type"]>;

      switch (this.outs[0].type) {
        case St.Float:
        case St.Integer:
        case St.Vector:
        case St.Bool:
          outVars = {
            "val": "{val}",
          };
          break;

        case St.ColorCoords:
        case St.VectorOrColor:
          outVars = {
            "val": "{val}",
            "illuminant": "{illuminant}",
            "xyz": "{xyz}",
          };
          break;
        
        default:
          throw new Error("not implemented");
      }

      return new WebglVariables(
        "",
        new Map([
          [this.outs[0], outVars],
        ]),
      );
    }

    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      switch (inSocket.effectiveType()) {
        case St.Float:
        case St.Integer:
        case St.Vector:
        case St.Bool:
          return <WebglSocketValue<T>>{
            "val": "val",
          };

        case St.ColorCoords:
          return <WebglSocketValue<T>>{
            "val": "val",
            "illuminant": "illuminant",
            "xyz": "xyz",
          };
        
        default:
          return null;
      }
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
      this.ins[0].type = St.Any;
    }
    */
  }
}