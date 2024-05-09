import { Node, SocketType, NodeEvalContext, InSocket, OutSocket, WebglSocketOutputMapping, webglOuts } from "../Node";

import { volatileInSocketOptions, volatileOutSocketOptions } from "./util";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace organization {
  export class ConditionalNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "conditional";

    private static readonly inputSlots = WebglSlot.ins("condition", "ifTrue", "ifFalse");

    constructor() {
      super();

      const {condition, ifTrue, ifFalse} = ConditionalNode.inputSlots;

      this.ins.push(
        new InSocket(this, SocketType.Bool, "Condition", {webglOutputMapping: {[webglOuts.val]: condition}}),
        new InSocket(this, SocketType.Float, "If true…", {
          webglOutputMapping: {[webglOuts.val]: ifTrue},
          sliderProps: {
            hasBounds: false,
          },
        }),
        new InSocket(this, SocketType.Float, "If false…", {
          webglOutputMapping: {[webglOuts.val]: ifFalse},
          sliderProps: {
            hasBounds: false,
          },
        }),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Float, "Value",
          context =>
              this.ins[0].inValue(context) ? this.ins[1].inValue(context) : this.ins[2].inValue(context),
          {
            webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.source`${condition} ? ${ifTrue} : ${ifFalse}`}),
          },
        ),
      );
    }

    webglBaseVariables(): WebglVariables {
      return WebglVariables.empty({node: this});
    }
  }

  export class RerouteNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "reroute";

    width = 15;

    private static readonly inputSlots = WebglSlot.ins("val", "illuminant", "xyz");
    
    constructor() {
      super();
      
      const {val, illuminant, xyz} = RerouteNode.inputSlots;

      this.ins.push(
        new InSocket(this, SocketType.Any, "", {
          ...volatileInSocketOptions(this.ins, this.outs),
          //@ts-ignore
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
        new OutSocket(this, SocketType.Any, "", context => this.ins[0].inValue(context), {
          ...volatileOutSocketOptions(this.ins, this.outs),
          webglOutputs: socket => () => {
            switch (this.outs[0].type) {
              case SocketType.Float:
              case SocketType.Integer:
              case SocketType.Vector:
              case SocketType.Bool:
                return {
                  [webglOuts.val]: WebglTemplate.slot(val),
                };
      
              case SocketType.ColorCoords:
              case SocketType.VectorOrColor:
                return {
                  [webglOuts.val]: WebglTemplate.slot(val),
                  [webglOuts.illuminant]: WebglTemplate.slot(illuminant),
                  [webglOuts.xyz]: WebglTemplate.slot(xyz),
                };
              
              default:
                throw new Error("not implemented");
            }
          },
        }),
      );
    }
    
    webglBaseVariables(context?: NodeEvalContext): WebglVariables {
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