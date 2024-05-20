import { StringKey } from "@/strings";
import { Node, SocketType, InSocket, OutSocket, webglStdOuts } from "../Node";
import { NodeWithOverloads, Overload, OverloadGroup } from "../Overload";

import { dynamicOutSocketOutputs, useDynamicallyTypedSockets } from "./util";
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
        new InSocket(this, SocketType.Bool, "label.socket.conditional.condition", { webglOutputMappingStatic: { [webglStdOuts.bool]: condition } }),
        new InSocket(this, SocketType.DynamicAny, "label.socket.conditional.ifTrue", {
          ...dynamicTyping.inSocketOptions(ifTrue),
          sliderProps: {
            hasBounds: false,
          },
        }),
        new InSocket(this, SocketType.DynamicAny, "label.socket.conditional.ifFalse", {
          ...dynamicTyping.inSocketOptions(ifFalse),
          sliderProps: {
            hasBounds: false,
          },
        }),
      );

      this.outs.push(
        new OutSocket(this, SocketType.DynamicAny, "label.socket.value",
          context => this.ins[0].inValue(context) ? this.ins[1].inValue(context) : this.ins[2].inValue(context),
          {
            ...dynamicTyping.outSocketOptions(),
            webglOutputs: socket => () => {
              //@ts-ignore
              if (socket.type === SocketType.Color) {
                return {
                  [webglStdOuts.color]: WebglTemplate.slot(outColor),
                };
              }

              return nonColorOutputs();
            },
          },
        ),
      );

      const nonColorOutputs = dynamicOutSocketOutputs(WebglTemplate.source`(${condition} ? ${ifTrue} : ${ifFalse})`)(this.outs[0]);
    }

    webglBaseVariables(): WebglVariables {
      const { condition, ifTrue, ifFalse } = ConditionalNode.inputSlots;
      const { outColor } = ConditionalNode.outputSlots;

      if (this.outs[0].type === SocketType.Color) {
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
          label: StringKey,
          outputLabel: StringKey,
          calculate: (val0: number, val1: number) => boolean,
          getTemplate: (inputSlots: typeof CompareFloatsNode["inputSlots"]) => WebglTemplate,
        }) => {
          const { val0, val1 } = this.inputSlots;
          const outputs = {[webglStdOuts.bool]: getTemplate(this.inputSlots)};
          
          return new Overload(
            label,
            node => {
              return [
                new InSocket(node, SocketType.Float, "label.socket.compareFloats.valueA", {
                  webglOutputMapping: socket => () => ({ [webglStdOuts.float]: val0 }),
                  sliderProps: {
                    hasBounds: false,
                  },
                }),
                new InSocket(node, SocketType.Float, "label.socket.compareFloats.valueB", {
                  webglOutputMapping: socket => () => ({ [webglStdOuts.float]: val1 }),
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
        label: "label.overload.compareFloats.greaterThan",
        outputLabel: "label.socket.compareFloats.a>b?",
        calculate: (a, b) => a > b,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} > ${val1}`,
      })],

      [CompareOverloadMode.GreaterThanOrEqualTo, this.comparisonOverload({
        label: "label.overload.compareFloats.greaterThanOrEqualTo",
        outputLabel: "label.socket.compareFloats.a>=b?",
        calculate: (a, b) => a >= b,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} >= ${val1}`,
      })],

      [CompareOverloadMode.EqualTo, this.comparisonOverload({
        label: "label.overload.compareFloats.equalTo",
        outputLabel: "label.socket.compareFloats.a=b?",
        calculate: (a, b) => a === b,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} == ${val1}`,
      })],

      [CompareOverloadMode.LessThanOrEqualTo, this.comparisonOverload({
        label: "label.overload.compareFloats.lessThanOrEqualTo",
        outputLabel: "label.socket.compareFloats.a<=b?",
        calculate: (a, b) => a <= b,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} <= ${val1}`,
      })],

      [CompareOverloadMode.LessThan, this.comparisonOverload({
        label: "label.overload.compareFloats.lessThanOrEqualTo",
        outputLabel: "label.socket.compareFloats.a<b?",
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