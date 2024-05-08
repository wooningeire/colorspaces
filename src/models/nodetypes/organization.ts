import {Tree, Node, Socket, SocketType as St, Link, NodeEvalContext, InSocket, OutSocket, WebglSocketValue, webglOuts} from "../Node";

import {Vec2} from "@/util";
import { volatileInSocketOptions, volatileOutSocketOptions } from "./util";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace organization {
  export class RerouteNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "reroute";
    
    constructor() {
      super();

      this.ins.push(
        new InSocket(this, St.Any, "", true, volatileInSocketOptions(this.ins, this.outs)),
      );

      this.outs.push(
        new OutSocket(this, St.Any, "", context => this.ins[0].inValue(context), true, volatileOutSocketOptions(this.ins, this.outs)),
      );

      this.width = 15;
    }

    private static readonly inputSlots = WebglSlot.ins("val", "illuminant", "xyz");
    
    webglGetBaseVariables(context?: NodeEvalContext): WebglVariables {
      const {val, illuminant, xyz} = RerouteNode.inputSlots;

      let outVars: Record<string, WebglTemplate>;

      switch (this.outs[0].type) {
        case St.Float:
        case St.Integer:
        case St.Vector:
        case St.Bool:
          outVars = {
            [webglOuts.val]: WebglTemplate.slot(val),
          };
          break;

        case St.ColorCoords:
        case St.VectorOrColor:
          outVars = {
            [webglOuts.val]: WebglTemplate.slot(val),
            [webglOuts.illuminant]: WebglTemplate.slot(illuminant),
            [webglOuts.xyz]: WebglTemplate.slot(xyz),
          };
          break;
        
        default:
          throw new Error("not implemented");
      }

      return WebglVariables.template``({
        socketOutVariables: new Map([
          [this.outs[0], outVars],
        ]),
      });
    }

    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      const {val, illuminant, xyz} = RerouteNode.inputSlots;

      switch (inSocket.effectiveType()) {
        case St.Float:
        case St.Integer:
        case St.Vector:
        case St.Bool:
          return <WebglSocketValue<T>>{
            [webglOuts.val]: val,
          };

        case St.ColorCoords:
          return <WebglSocketValue<T>>{
            [webglOuts.val]: val,
            [webglOuts.illuminant]: illuminant,
            [webglOuts.xyz]: xyz,
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