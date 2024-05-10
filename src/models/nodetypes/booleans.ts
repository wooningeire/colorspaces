import { Node, SocketType, InSocket, OutSocket, webglOuts } from "../Node";
import { NodeWithOverloads, Overload, OverloadGroup } from "../Overload";

import { useDynamicallyTypedSockets } from "./util";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace booleans {
  export class ConditionalNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "conditional";

    private static readonly inputSlots = WebglSlot.ins("condition", "ifTrue", "ifFalse");
    private static readonly outputSlots = WebglSlot.outs("outColor");

    constructor() {
      super();

      const { condition, ifTrue, ifFalse } = ConditionalNode.inputSlots;
      const { outColor } = ConditionalNode.outputSlots;

      const dynamicTyping = useDynamicallyTypedSockets(
        () => [this.ins[1], this.ins[2]],
        () => [this.outs[0]],
      );

      this.ins.push(
        new InSocket(this, SocketType.Bool, "Condition", { webglOutputMapping: { [webglOuts.val]: condition } }),
        new InSocket(this, SocketType.Any, "If true…", {
          ...dynamicTyping.inSocketOptions,
          //@ts-ignore
          webglGetOutputMapping: socket => () => ({ [webglOuts.val]: ifTrue }),
          sliderProps: {
            hasBounds: false,
          },
        }),
        new InSocket(this, SocketType.Any, "If false…", {
          ...dynamicTyping.inSocketOptions,
          //@ts-ignore
          webglGetOutputMapping: socket => () => ({ [webglOuts.val]: ifFalse }),
          sliderProps: {
            hasBounds: false,
          },
        }),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Any, "Value",
          context => this.ins[0].inValue(context) ? this.ins[1].inValue(context) : this.ins[2].inValue(context),
          {
            ...dynamicTyping.outSocketOptions,
            webglOutputs: socket => () => {
              if (socket.type === SocketType.ColorComponents) {
                return {
                  [webglOuts.val]: WebglTemplate.slot(outColor),
                };
              }

              return {
                [webglOuts.val]: WebglTemplate.source`(${condition} ? ${ifTrue} : ${ifFalse})`,
              };
            },
          },
        ),
      );
    }

    webglBaseVariables(): WebglVariables {
      const { condition, ifTrue, ifFalse } = ConditionalNode.inputSlots;
      const { outColor } = ConditionalNode.outputSlots;

      if (this.outs[0].type === SocketType.ColorComponents) {
        return WebglVariables.template`Color ${outColor};
if (${condition}) {
  ${outColor} = ${ifTrue};
} else {
  ${outColor} = ${ifFalse};
}`({
          node: this,
        });
      }

      return WebglVariables.empty({ node: this });
    }
  }

  enum CompareOverloadMode {
    GreaterThan = "greater than",
    GreaterThanOrEqualTo = "greater than or equal to",
    EqualTo = "equal to",
    LessThanOrEqualTo = "less than or equal to",
    LessThan = "less than",
  }

  export class CompareFloatsNode extends NodeWithOverloads<CompareOverloadMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "compareFloats";

    private static readonly inputSlots = WebglSlot.ins("val0", "val1");
    private static readonly comparisonOverload =
        ({
          label,
          outputLabel,
          calculate,
          getTemplate,
        }: {
          label: string,
          outputLabel: string,
          calculate: (val0: number, val1: number) => boolean,
          getTemplate: (inputSlots: typeof CompareFloatsNode["inputSlots"]) => WebglTemplate,
        }) => {
          const { val0, val1 } = this.inputSlots;
          const outputs = {[webglOuts.val]: getTemplate(this.inputSlots)};
          
          return new Overload(
            label,
            node => {
              return [
                new InSocket(node, SocketType.Float, "Value A", {
                  //@ts-ignore
                  webglGetOutputMapping: socket => () => ({ [webglOuts.val]: val0 }),
                  sliderProps: {
                    hasBounds: false,
                  },
                }),
                new InSocket(node, SocketType.Float, "Value B", {
                  //@ts-ignore
                  webglGetOutputMapping: socket => () => ({ [webglOuts.val]: val1 }),
                  sliderProps: {
                    hasBounds: false,
                  },
                }),
              ];
            },
            (node, ins) => [
              new OutSocket(node, SocketType.Bool, outputLabel,
                context => calculate(ins[0].inValue(context), ins[1].inValue(context)),
                {
                  webglOutputs: socket => () => outputs,
                },
              ),
            ],
            () => ({values: [], labels: [], flags: []}),
            (ins, outs, context, node) => WebglVariables.empty({ node }),
            () => outputs,
          );
        };

    static readonly overloadGroup = new OverloadGroup(new Map([
      [CompareOverloadMode.GreaterThan, this.comparisonOverload({
        label: "Greater than",
        outputLabel: "A > B?",
        calculate: (a, b) => a > b,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} > ${val1}`,
      })],

      [CompareOverloadMode.GreaterThanOrEqualTo, this.comparisonOverload({
        label: "Greater than or equal to",
        outputLabel: "A ≥ B?",
        calculate: (a, b) => a >= b,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} >= ${val1}`,
      })],

      [CompareOverloadMode.EqualTo, this.comparisonOverload({
        label: "Equal to",
        outputLabel: "A = B?",
        calculate: (a, b) => a === b,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} == ${val1}`,
      })],

      [CompareOverloadMode.LessThanOrEqualTo, this.comparisonOverload({
        label: "Less than or equal to",
        outputLabel: "A ≤ B?",
        calculate: (a, b) => a <= b,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} <= ${val1}`,
      })],

      [CompareOverloadMode.LessThan, this.comparisonOverload({
        label: "Less than",
        outputLabel: "A < B?",
        calculate: (a, b) => a < b,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} < ${val1}`,
      })],
    ]));

    width = 200;

    constructor() {
      super(CompareOverloadMode.GreaterThan);
    }
  }
}