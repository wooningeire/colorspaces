import { Node, SocketType, InSocket, OutSocket, webglOuts } from "../Node";

import { useDynamicallyTypedSockets } from "./util";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace booleans {
  export class ConditionalNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "conditional";

    private static readonly inputSlots = WebglSlot.ins("condition", "ifTrue", "ifFalse");

    constructor() {
      super();

      const {condition, ifTrue, ifFalse} = ConditionalNode.inputSlots;

      const dynamicTyping = useDynamicallyTypedSockets(
        () => [this.ins[1], this.ins[2]],
        () => [this.outs[0]],
      );

      this.ins.push(
        new InSocket(this, SocketType.Bool, "Condition", {webglOutputMapping: {[webglOuts.val]: condition}}),
        new InSocket(this, SocketType.Any, "If true…", {
          ...dynamicTyping.inSocketOptions,
          webglGetOutputMapping: socket => () => {
            return {[webglOuts.val]: ifTrue};
          },
          sliderProps: {
            hasBounds: false,
          },
        }),
        new InSocket(this, SocketType.Any, "If false…", {
          ...dynamicTyping.inSocketOptions,
          webglGetOutputMapping: socket => () => {
            return {[webglOuts.val]: ifFalse};
          },
          sliderProps: {
            hasBounds: false,
          },
        }),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Any, "Value",
          context =>
              this.ins[0].inValue(context) ? this.ins[1].inValue(context) : this.ins[2].inValue(context),
          {
            ...dynamicTyping.outSocketOptions,
            webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.source`${condition} ? ${ifTrue} : ${ifFalse}`}),
          },
        ),
      );
    }

    webglBaseVariables(): WebglVariables {
      return WebglVariables.empty({node: this});
    }
  }
}