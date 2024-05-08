import { Node, SocketType, NodeEvalContext, InSocket, OutSocket, WebglSocketOutputMapping, webglOuts } from "../Node";

import { volatileInSocketOptions, volatileOutSocketOptions } from "./util";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace organization {
  export class RerouteNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "reroute";
    
    constructor() {
      super();
      
      const {val, illuminant, xyz} = RerouteNode.inputSlots;

      this.ins.push(
        new InSocket(this, SocketType.Any, "", {
          ...volatileInSocketOptions(this.ins, this.outs),
          webglGetOutputMapping: socket => () => {
            switch (socket.effectiveType()) {
              case SocketType.Float:
              case SocketType.Integer:
              case SocketType.Vector:
              case SocketType.Bool:
                return {
                  [webglOuts.val]: val,
                };
      
              case SocketType.ColorCoords:
                return {
                  [webglOuts.val]: val,
                  [webglOuts.illuminant]: illuminant,
                  [webglOuts.xyz]: xyz,
                };
              
              default:
                return null;
            }
          },
        }),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Any, "", context => this.ins[0].inValue(context), volatileOutSocketOptions(this.ins, this.outs)),
      );

      this.width = 15;
    }

    private static readonly inputSlots = WebglSlot.ins("val", "illuminant", "xyz");
    
    webglGetBaseVariables(context?: NodeEvalContext): WebglVariables {
      const {val, illuminant, xyz} = RerouteNode.inputSlots;

      let outVars: Record<string, WebglTemplate>;

      switch (this.outs[0].type) {
        case SocketType.Float:
        case SocketType.Integer:
        case SocketType.Vector:
        case SocketType.Bool:
          outVars = {
            [webglOuts.val]: WebglTemplate.slot(val),
          };
          break;

        case SocketType.ColorCoords:
        case SocketType.VectorOrColor:
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