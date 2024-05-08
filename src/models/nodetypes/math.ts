import seedrandom from "seedrandom";

import { labSliderProps } from "./spaces";
import { Node, Socket, SocketType, NodeEvalContext, OutputDisplayType, OutSocket, InSocket, WebglSocketValue, webglOuts as webglOuts } from "../Node";
import * as cm from "../colormanagement";

import { Vec3, lerp, mod } from "@/util";
import { Overload, OverloadGroup, NodeWithOverloads } from "../Overload";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";
import { randFloat, randFloatVec3Seed } from "../colormanagement/random";

export namespace math {
  const singleDisplayValue: ConstructorParameters<typeof Overload>[3] =
      (ins, outs, context) => ({
        values: outs[0].outValue(context),
        labels: [],
        flags: [],
      });

  enum VectorArithmeticMode {
    Lerp = "lerp",
    Add = "add",
    Multiply = "multiply",
    Subtract = "subtract",
    Divide = "divide",
    Screen = "screen",
    Distance = "distance",
    Scale = "scale",
  }
  export class VectorArithmeticNode extends NodeWithOverloads<VectorArithmeticMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "vectorArithmetic";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    private static readonly inputSlots = WebglSlot.ins("fac", "val0", "val1", "vector", "scalar");

    private static singleOutVariable =
        (getTemplate: (inputSlots: typeof VectorArithmeticNode["inputSlots"]) => WebglTemplate): ConstructorParameters<typeof Overload<VectorArithmeticMode>>[4] =>
            (ins, outs, context, node) => {
              const template = getTemplate(this.inputSlots);
      
              return WebglVariables.template``({
                socketOutVariables: new Map([
                  [outs[0], {[webglOuts.val]: template}],
                ]),
                nodeOutVariables: {[webglOuts.val]: template},
              });
            };

    private static threeValueOverload =
        ({
          label,
          operandLabels,
          outputLabel="Vector",
          defaultBlendAmount=1,
          calculate,
          getTemplate,
        }: {
          label: string,
          operandLabels: [string, string],
          outputLabel?: string,
          defaultBlendAmount?: number,
          calculate: (fac: number, val0: Vec3, val1: Vec3) => Vec3,
          getTemplate: (inputSlots: typeof VectorArithmeticNode["inputSlots"]) => WebglTemplate,
        }) => new Overload(
          label,
          node => [
            new InSocket(node, SocketType.Float, "Blend amount", true, {defaultValue: defaultBlendAmount}),
            new InSocket(node, SocketType.Vector, operandLabels[0]),
            new InSocket(node, SocketType.Vector, operandLabels[1]),
          ],
          (node, ins) => [
            new OutSocket(node, SocketType.Vector, outputLabel, context => calculate(...ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3])),
          ],
          singleDisplayValue,
          this.singleOutVariable(getTemplate),
          (<St extends SocketType>(inSocket: InSocket<St>, ins: InSocket[], node: VectorArithmeticMode) => {
            const {fac, val0, val1} = this.inputSlots;
  
            switch (inSocket) {
              case ins[0]: return <WebglSocketValue<St>>{[webglOuts.val]: fac};
              case ins[1]: return <WebglSocketValue<St>>{[webglOuts.val]: val0};
              case ins[2]: return <WebglSocketValue<St>>{[webglOuts.val]: val1};
              default: return null;
            }
          }) as ConstructorParameters<typeof Overload<VectorArithmeticMode>>[5],
        );

    static readonly overloadGroup = new OverloadGroup(new Map<VectorArithmeticMode, Overload<Vec3 | number>>([
      [VectorArithmeticMode.Lerp, this.threeValueOverload({
        label: "Lerp",
        operandLabels: ["Start", "End"],
        defaultBlendAmount: 0.5,
        calculate: (fac, val0, val1) => val0.map((_, i) => lerp(val0[i], val1[i], fac)) as Vec3,
        getTemplate: ({fac, val0, val1}) => WebglTemplate.source`mix(${val0}, ${val1}, ${fac})`,
      })],

      [VectorArithmeticMode.Add, this.threeValueOverload({
        label: "Add",
        operandLabels: ["Addend", "Addend"],
        outputLabel: "Sum",
        calculate: (fac, val0, val1) => val0.map((_, i) => val0[i] + val1[i] * fac) as Vec3,
        getTemplate: ({fac, val0, val1}) => WebglTemplate.source`${val0} + ${val1} * ${fac}`,
      })],

      [VectorArithmeticMode.Multiply, this.threeValueOverload({
        label: "Componentwise multiply",
        operandLabels: ["Factor", "Factor"],
        outputLabel: "Product",
        calculate: (fac, val0, val1) => val0.map((_, i) => val0[i] * ((1 - fac) + val1[i] * fac)) as Vec3,
        getTemplate: ({fac, val0, val1}) => WebglTemplate.source`${val0} * ((1. - ${fac}) + ${val1} * ${fac})`,
      })],

      [VectorArithmeticMode.Subtract, this.threeValueOverload({
        label: "Subtract",
        operandLabels: ["Minuend", "Subtrahend"],
        outputLabel: "Difference",
        calculate: (fac, val0, val1) => val0.map((_, i) => val0[i] - val1[i] * fac) as Vec3,
        getTemplate: ({fac, val0, val1}) => WebglTemplate.source`${val0} - ${val1} * ${fac}`,
      })],

      [VectorArithmeticMode.Divide, this.threeValueOverload({
        label: "Componentwise divide",
        operandLabels: ["Dividend", "Divisor"],
        outputLabel: "Quotient",
        calculate: (fac, val0, val1) => val0.map((_, i) => val0[i] / ((1 - fac) + val1[i] * fac)) as Vec3,
        getTemplate: ({fac, val0, val1}) => WebglTemplate.source`${val0} / ((1. - ${fac}) + ${val1} * ${fac})`,
      })],

      [VectorArithmeticMode.Screen, this.threeValueOverload({
        label: "Screen",
        operandLabels: ["Factor", "Factor"],
        outputLabel: "Product",
        calculate: (fac, val0, val1) => val0.map((_, i) => 1 - (1 - val0[i]) * (1 - val1[i] * fac)) as Vec3,
        getTemplate: ({fac, val0, val1}) => WebglTemplate.source`1. - (1. - ${val0}) * (1. - ${val1} * ${fac})`,
      })],
      
      [VectorArithmeticMode.Distance, new Overload(
        "Distance",
        node => [
          new InSocket(node, SocketType.Vector, "Vector"),
          new InSocket(node, SocketType.Vector, "Vector"),
        ],
        (node, ins) => [
          new OutSocket(node, SocketType.Float, "Distance", context => {
            const [val0, val1] = ins.map(socket => socket.inValue(context)) as [Vec3, Vec3];
            return Math.hypot(...val0.map((_, i) => val0[i] - val1[i]));
          }),
        ],
        singleDisplayValue,
        this.singleOutVariable(({val0, val1}) => WebglTemplate.source`length(${val0} - ${val1})`),
        <St extends SocketType>(inSocket: InSocket<St>, ins: InSocket[], node: VectorArithmeticNode) => {
          const {val0, val1} = VectorArithmeticNode.inputSlots;

          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<St>>{[webglOuts.val]: val0};
            case ins[1]: return <WebglSocketValue<St>>{[webglOuts.val]: val1};
            default: return null;
          }
        },
      )],

      [VectorArithmeticMode.Scale, new Overload(
        "Scalar multiply",
        node => [
          new InSocket(node, SocketType.Vector, "Vector"),
          new InSocket(node, SocketType.Float, "Scalar"),
        ],
        (node, ins) => [
          new OutSocket(node, SocketType.Vector, "Vector", context => {
            const [col, scalar] = ins.map(socket => socket.inValue(context)) as [Vec3, number];
            return col.map((_, i) => col[i] * scalar) as Vec3;
          }),
        ],
        singleDisplayValue,
        this.singleOutVariable(({vector, scalar}) => WebglTemplate.source`${vector} * ${scalar}`),
        <St extends SocketType>(inSocket: InSocket<St>, ins: InSocket[], node: VectorArithmeticNode) => {
          const {vector, scalar} = VectorArithmeticNode.inputSlots;

          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<St>>{[webglOuts.val]: vector};
            case ins[1]: return <WebglSocketValue<St>>{[webglOuts.val]: scalar};
            default: return null;
          }
        },
      )],
    ]));

    width = 200;

    constructor() {
      super(VectorArithmeticMode.Lerp);
    }
  }


  enum ArithmeticMode {
    Add = "add",
    Multiply = "multiply",
    Subtract = "subtract",
    Divide = "divide",
    Pow = "pow",
    Screen = "screen",
    Lerp = "lerp",
    MapRange = "mapRange",
    Floor = "floor",
    Quantize = "quantize",
  }
  export class ArithmeticNode extends NodeWithOverloads<ArithmeticMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "arithmetic";
    static readonly outputDisplayType = OutputDisplayType.Float;

    private static readonly inputSlots = WebglSlot.ins("val0", "val1", "min", "max", "fac", "source", "sourceMin", "sourceMax", "targetMin", "targetMax", "val", "nSegments");

    private static singleOutVariable =
        (getTemplate: (inputSlots: typeof ArithmeticNode["inputSlots"]) => WebglTemplate): ConstructorParameters<typeof Overload>[4] =>
            (ins, outs, context, node) => {
              const template = getTemplate(this.inputSlots);
      
              return WebglVariables.template``({
                socketOutVariables: new Map([
                  [outs[0], {[webglOuts.val]: template}],
                ]),
                nodeOutVariables: {[webglOuts.val]: template},
              });
            };
    
    private static singleOutputOverload = <InSockets extends InSocket[]>({
      label,
      ins,
      outputLabel="Value",
      calculate,
      getTemplate,
      getMapper,
    }: {
      label: string,
      ins: (...args: Parameters<ConstructorParameters<typeof Overload>[1]>) => [...InSockets],
      outputLabel?: string,
      calculate: (...inputs: {[I in keyof InSockets]: ReturnType<InSockets[I]["inValue"]>}) => number,
      getTemplate: (inputSlots: typeof ArithmeticNode["inputSlots"]) => WebglTemplate,
      getMapper: (inputSlots: typeof ArithmeticNode["inputSlots"]) => ConstructorParameters<typeof Overload>[5],
    }) => new Overload(
      label,
      ins,
      (node, ins) => [
        new OutSocket(node, SocketType.Float, outputLabel, context => calculate(...ins.map(socket => socket.inValue(context)) as {[I in keyof InSockets]: ReturnType<InSockets[I]["inValue"]>})),
      ],
      singleDisplayValue,
      this.singleOutVariable(getTemplate),
      getMapper(this.inputSlots),
    );

    private static singleOutputTwoInputsOverload = ({
      label,
      operandLabels,
      outputLabel="Value",
      calculate,
      getTemplate,
    }: {
      label: string,
      operandLabels: [string, string],
      outputLabel?: string,
      calculate: (val0: number, val1: number) => number,
      getTemplate: (inputSlots: typeof ArithmeticNode["inputSlots"]) => WebglTemplate,
    }) => this.singleOutputOverload({
      label,
      ins: node => [
        new InSocket(node, SocketType.Float, operandLabels[0], true, {sliderProps: {hasBounds: false}}),
        new InSocket(node, SocketType.Float, operandLabels[1], true, {sliderProps: {hasBounds: false}}),
      ],
      outputLabel,
      calculate,
      getTemplate,
      getMapper: ({val0, val1}) =>
          (<St extends SocketType>(inSocket: InSocket<St>, ins: InSocket[], node: ArithmeticNode) => {
            switch (inSocket) {
              case ins[0]: return <WebglSocketValue<St>>{[webglOuts.val]: val0};
              case ins[1]: return <WebglSocketValue<St>>{[webglOuts.val]: val1};
              default: return null;
            }
          }) as ConstructorParameters<typeof Overload<VectorArithmeticMode>>[5],
    });

    static readonly overloadGroup = new OverloadGroup(new Map<ArithmeticMode, Overload<number>>([
      [ArithmeticMode.Add, this.singleOutputTwoInputsOverload({
        label: "Add",
        operandLabels: ["Addend", "Addend"],
        outputLabel: "Sum",
        calculate: (val0, val1) => val0 + val1,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} + ${val1}`,
      })],

      [ArithmeticMode.Multiply, this.singleOutputTwoInputsOverload({
        label: "Multiply",
        operandLabels: ["Factor", "Factor"],
        outputLabel: "Product",
        calculate: (val0, val1) => val0 * val1,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} * ${val1}`,
      })],
      
      [ArithmeticMode.Subtract, this.singleOutputTwoInputsOverload({
        label: "Subtract",
        operandLabels: ["Minuend", "Subtrahend"],
        outputLabel: "Difference",
        calculate: (val0, val1) => val0 - val1,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} - ${val1}`,
      })],
      
      [ArithmeticMode.Divide, this.singleOutputTwoInputsOverload({
        label: "Divide",
        operandLabels: ["Dividend", "Divisor"],
        outputLabel: "Quotient",
        calculate: (val0, val1) => val0 / val1,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} / ${val1}`,
      })],
      
      [ArithmeticMode.Pow, this.singleOutputTwoInputsOverload({
        label: "Power",
        operandLabels: ["Base", "Exponent"],
        outputLabel: "Power",
        calculate: (val0, val1) => val0 ** val1,
        getTemplate: ({val0, val1}) => WebglTemplate.source`pow(${val0}, ${val1})`,
      })],
      
      [ArithmeticMode.Screen, this.singleOutputTwoInputsOverload({
        label: "Screen",
        operandLabels: ["Factor", "Factor"],
        outputLabel: "Product",
        calculate: (val0, val1) => 1 - (1 - val0) * (1 - val1),
        getTemplate: ({val0, val1}) => WebglTemplate.source`1. - (1. - ${val0}) * (1. - ${val1})`,
      })],
      
      [ArithmeticMode.Lerp, this.singleOutputOverload({
        label: "Lerp",
        ins: node => [
          new InSocket(node, SocketType.Float, "Min", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, SocketType.Float, "Max", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, SocketType.Float, "Amount"),
        ],
        calculate: lerp,
        getTemplate: ({min, max, fac}) => WebglTemplate.source`mix(${min}, ${max}, ${fac})`,
        getMapper: ({min, max, fac}) =>
            <St extends SocketType>(inSocket: InSocket<St>, ins: InSocket[], node: Node) => {
              switch (inSocket) {
                case ins[0]: return <WebglSocketValue<St>>{[webglOuts.val]: min};
                case ins[1]: return <WebglSocketValue<St>>{[webglOuts.val]: max};
                case ins[2]: return <WebglSocketValue<St>>{[webglOuts.val]: fac};
                default: return null;
              }
            },
          })],
          
      [ArithmeticMode.MapRange, this.singleOutputOverload({
        label: "Map range",
        ins: node => [
          new InSocket(node, SocketType.Float, "Source value", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, SocketType.Float, "Source min", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, SocketType.Float, "Source max", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, SocketType.Float, "Target min", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, SocketType.Float, "Target max", true, {sliderProps: {hasBounds: false}}),
        ],
        calculate: (value, srcMin, srcMax, dstMin, dstMax) => lerp(dstMin, dstMax, value / (srcMax - srcMin)),
        getTemplate: ({source, sourceMin, sourceMax, targetMin, targetMax}) => WebglTemplate.source`mix(${targetMin}, ${targetMax}, ${source} / (${sourceMax} - ${sourceMin}))`,
        getMapper: ({source, sourceMin, sourceMax, targetMin, targetMax}) =>
            <St extends SocketType>(inSocket: InSocket<St>, ins: InSocket[], node: Node) => {
              switch (inSocket) {
                case ins[0]: return <WebglSocketValue<St>>{[webglOuts.val]: source};
                case ins[1]: return <WebglSocketValue<St>>{[webglOuts.val]: sourceMin};
                case ins[2]: return <WebglSocketValue<St>>{[webglOuts.val]: sourceMax};
                case ins[3]: return <WebglSocketValue<St>>{[webglOuts.val]: targetMin};
                case ins[4]: return <WebglSocketValue<St>>{[webglOuts.val]: targetMax};
                default: return null;
              }
            },
      })],
      
      [ArithmeticMode.Floor, this.singleOutputOverload({
        label: "Floor",
        ins: node => [
          new InSocket(node, SocketType.Float, "Value", true, {sliderProps: {hasBounds: false}}),
        ],
        calculate: Math.floor,
        getTemplate: ({val}) => WebglTemplate.source`floor(${val})`,
        getMapper: ({val}) =>
            <St extends SocketType>(inSocket: InSocket<St>, ins: InSocket[], node: Node) => {
              switch (inSocket) {
                case ins[0]: return <WebglSocketValue<St>>{[webglOuts.val]: val};
                default: return null;
              }
            },
      })],
      
      [ArithmeticMode.Quantize, this.singleOutputOverload({
        label: "Quantize",
        ins: node => [
          new InSocket(node, SocketType.Float, "Value", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, SocketType.Float, "# segments", true, {sliderProps: {hasBounds: false, step: 1}, defaultValue: 4}),
        ],
        calculate: (value, nSegments) => Math.floor(value * nSegments) / nSegments,
        getTemplate: ({val, nSegments}) => WebglTemplate.source`floor(${val} * ${nSegments}) / (${nSegments} - 1.)`,
        getMapper: ({val, nSegments}) =>
            <St extends SocketType>(inSocket: InSocket<St>, ins: InSocket[], node: Node) => {
              switch (inSocket) {
                case ins[0]: return <WebglSocketValue<St>>{[webglOuts.val]: val};
                case ins[1]: return <WebglSocketValue<St>>{[webglOuts.val]: nSegments};
                default: return null;
              }
            },
      })],
    ]));

    constructor() {
      super(ArithmeticMode.Add);
    }
  }

  export class VectorNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "vector";

    constructor() {
      super();

      this.ins.push(
        new InSocket(this, SocketType.Float, "", true, {
          sliderProps: {
            hasBounds: false,
          },
        }),
        new InSocket(this, SocketType.Float, "", true, {
          sliderProps: {
            hasBounds: false,
          },
        }),
        new InSocket(this, SocketType.Float, "", true, {
          sliderProps: {
            hasBounds: false,
          },
        }),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Vector, "Vector", context => this.ins.map(socket => socket.inValue(context)) as Vec3),
      );
    }

    private static readonly inputSlots = WebglSlot.ins("x", "y", "z");

    webglGetBaseVariables(): WebglVariables {
      const {x, y, z} = VectorNode.inputSlots;

      return WebglVariables.template``({
        socketOutVariables: new Map([
          [this.outs[0], {[webglOuts.val]: WebglTemplate.source`vec3(${x}, ${y}, ${z})`}],
        ]),
      });
    }
    webglGetMapping<St extends SocketType>(inSocket: InSocket<St>): WebglSocketValue<St> | null {
      const {x, y, z} = VectorNode.inputSlots;

      switch (inSocket) {
        case this.ins[0]: return <WebglSocketValue<St>>{[webglOuts.val]: x};
        case this.ins[1]: return <WebglSocketValue<St>>{[webglOuts.val]: y};
        case this.ins[2]: return <WebglSocketValue<St>>{[webglOuts.val]: z};
        default: return null;
      }
    }
  }

  export class SplitVectorNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "splitVector";

    private readonly inSocket: InSocket<SocketType.Vector>;

    constructor() {
      super();

      this.ins.push(
        (this.inSocket = new InSocket(this, SocketType.Vector, "Vector")),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Float, "1", context => this.inSocket.inValue(context)[0]),
        new OutSocket(this, SocketType.Float, "2", context => this.inSocket.inValue(context)[1]),
        new OutSocket(this, SocketType.Float, "3", context => this.inSocket.inValue(context)[2]),
      );
    }

    private static readonly inputSlots = WebglSlot.ins("vec");

    webglGetBaseVariables(): WebglVariables {
      const {vec} = SplitVectorNode.inputSlots;

      return WebglVariables.template``({
        socketOutVariables: new Map([
          [this.outs[0], {[webglOuts.val]: WebglTemplate.source`${vec}.x`}],
          [this.outs[1], {[webglOuts.val]: WebglTemplate.source`${vec}.y`}],
          [this.outs[2], {[webglOuts.val]: WebglTemplate.source`${vec}.z`}],
        ]),
      });
    }
    webglGetMapping<St extends SocketType>(inSocket: InSocket<St>): WebglSocketValue<St> | null {
      const {vec} = SplitVectorNode.inputSlots;

      switch (inSocket) {
        case this.ins[0]: return <WebglSocketValue<St>>{[webglOuts.val]: vec};
        default: return null;
      }
    }
  }

  enum ColorDifferenceMode {
    DeltaE1976 = "deltae1976",
    DeltaE2000 = "deltae2000",
  }
  export class ColorDifferenceNode extends NodeWithOverloads<ColorDifferenceMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "colorDifference";
    static readonly outputDisplayType: OutputDisplayType = OutputDisplayType.Float;

    private static readonly inputSlots = WebglSlot.ins("xyz0", "xyz1", "illuminant0", "illuminant1");

    static readonly overloadGroup = new OverloadGroup(new Map<ColorDifferenceMode, Overload<Vec3 | number>>([
      [ColorDifferenceMode.DeltaE1976, new Overload(
        "ΔE* 1976",
        node => [
          new InSocket(node, SocketType.VectorOrColor, "L*a*b* or color", true, {
            sliderProps: labSliderProps,
          }),
          new InSocket(node, SocketType.VectorOrColor, "L*a*b* or color", true, {
            sliderProps: labSliderProps,
          }),
        ],
        (node, ins) => [
          new OutSocket(node, SocketType.Float, "Difference", context => {
            const val0 = ins[0].inValue(context);
            const val1 = ins[1].inValue(context);
  
            return cm.difference.deltaE1976(val0, val1);
          }),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context) => {
          const difference = WebglSlot.out("difference");
          const {xyz0, xyz1, illuminant0, illuminant1} = ColorDifferenceNode.inputSlots;

          const illuminant0Template = ins[0].effectiveType() === SocketType.Vector
              ? WebglTemplate.string("illuminant2_E")
              : WebglTemplate.slot(illuminant0);
          const illuminant1Template = ins[1].effectiveType() === SocketType.Vector
              ? WebglTemplate.string("illuminant2_E")
              : WebglTemplate.slot(illuminant1);
    
          return WebglVariables.templateConcat`float ${difference} = deltaE1976(${xyz0}, ${illuminant0Template}, ${xyz1}, ${illuminant1Template});`({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.slot(difference)}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.slot(difference)},
          });
        },
        <St extends SocketType>(inSocket: InSocket<St>, ins: InSocket[], node: ColorDifferenceNode) => {
          const {xyz0, xyz1, illuminant0, illuminant1} = ColorDifferenceNode.inputSlots;

          switch (inSocket) {
            case ins[0]: 
              if (ins[0].effectiveType() === SocketType.ColorCoords) {
                return <WebglSocketValue<St>>{
                  [webglOuts.xyz]: xyz0,
                  [webglOuts.illuminant]: illuminant0,
                };
              } else {
                return <WebglSocketValue<St>>{
                  [webglOuts.val]: xyz0,
                };
              }
    
            case ins[1]: 
              if (ins[1].effectiveType() === SocketType.ColorCoords) {
                return <WebglSocketValue<St>>{
                  [webglOuts.xyz]: xyz1,
                  [webglOuts.illuminant]: illuminant1,
                };
              } else {
                return <WebglSocketValue<St>>{
                  [webglOuts.val]: xyz1,
                };
              }
    
            default:
              return null;
          }
        },
      )],
      
      [ColorDifferenceMode.DeltaE2000, new Overload(
        "ΔE* 2000",
        node => [
          new InSocket(node, SocketType.VectorOrColor, "Sample L*a*b* or color", true, {
            sliderProps: labSliderProps,
          }),
          new InSocket(node, SocketType.VectorOrColor, "Target L*a*b* or color", true, {
            sliderProps: labSliderProps,
          }),
        ],
        (node, ins) => [
          new OutSocket(node, SocketType.Float, "Difference", context => {
            const val0 = ins[0].inValue(context);
            const val1 = ins[1].inValue(context);
  
            return cm.difference.deltaE2000(val0, val1);
          }),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context) => {
          const difference = WebglSlot.out("difference");
          const {xyz0, xyz1, illuminant0, illuminant1} = ColorDifferenceNode.inputSlots;

          const illuminant0Template = ins[0].effectiveType() === SocketType.Vector
              ? WebglTemplate.string("illuminant2_E")
              : WebglTemplate.slot(illuminant0);
          const illuminant1Template = ins[1].effectiveType() === SocketType.Vector
              ? WebglTemplate.string("illuminant2_E")
              : WebglTemplate.slot(illuminant1);
    
          return WebglVariables.templateConcat`float ${difference} = deltaE2000(${xyz0}, ${illuminant0Template}, ${xyz1}, ${illuminant1Template});`({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.slot(difference)}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.slot(difference)},
          });
        },
        <St extends SocketType>(inSocket: InSocket<St>, ins: InSocket[], node: ColorDifferenceNode) => {
          const {xyz0, xyz1, illuminant0, illuminant1} = ColorDifferenceNode.inputSlots;

          switch (inSocket) {
            case ins[0]: 
              if (ins[0].effectiveType() === SocketType.ColorCoords) {
                return <WebglSocketValue<St>>{
                  [webglOuts.xyz]: xyz0,
                  [webglOuts.illuminant]: illuminant0,
                };
              } else {
                return <WebglSocketValue<St>>{
                  [webglOuts.val]: xyz0,
                };
              }
    
            case ins[1]: 
              if (ins[1].effectiveType() === SocketType.ColorCoords) {
                return <WebglSocketValue<St>>{
                  [webglOuts.xyz]: xyz1,
                  [webglOuts.illuminant]: illuminant1,
                };
              } else {
                return <WebglSocketValue<St>>{
                  [webglOuts.val]: xyz1,
                };
              }
    
            default:
              return null;
          }
        },
      )],
    ]));

    constructor() {
      super(ColorDifferenceMode.DeltaE2000);
    }
  }

  export class ContrastRatioNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "contrastRatio";
    static readonly outputDisplayType: OutputDisplayType = OutputDisplayType.Float;

    private readonly colorSockets: InSocket<SocketType.VectorOrColor>[];

    constructor() {
      super();

      this.ins.push(
        ...(this.colorSockets = [
          new InSocket(this, SocketType.VectorOrColor, "XYZ or color"),
          new InSocket(this, SocketType.VectorOrColor, "XYZ or color"),
        ]),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Float, "Ratio", context => {
          const val0 = this.colorSockets[0].inValue(context);
          const val1 = this.colorSockets[1].inValue(context);

          return cm.difference.contrastRatio(val0, val1);
        }),
      );
    }

    display(context: NodeEvalContext) {
      return {
        values: [this.outs[0].outValue(context)],
        labels: [],
        flags: [],
      };
    }

    private static readonly inputSlots = WebglSlot.ins("xyz0", "xyz1", "illuminant0", "illuminant1");

    webglGetBaseVariables(): WebglVariables {
      const contrastRatio = WebglSlot.out("contrastRatio");
      const {xyz0, xyz1, illuminant0, illuminant1} = ContrastRatioNode.inputSlots;

      const illuminant0Template = this.colorSockets[0].effectiveType() === SocketType.Vector
          ? WebglTemplate.string("illuminant2_E")
          : WebglTemplate.slot(illuminant0)
      const illuminant1Template = this.colorSockets[1].effectiveType() === SocketType.Vector
          ? WebglTemplate.string("illuminant2_E")
          : WebglTemplate.slot(illuminant1)

      return WebglVariables.templateConcat`float ${contrastRatio} = contrastRatio(${xyz0}, ${illuminant0Template}, ${xyz1}, ${illuminant1Template});`({
        socketOutVariables: new Map([
          [this.outs[0], {[webglOuts.val]: WebglTemplate.slot(contrastRatio)}],
        ]),
        nodeOutVariables: {[webglOuts.val]: WebglTemplate.slot(contrastRatio)},
      });
    }
    webglGetMapping<St extends SocketType>(inSocket: InSocket<St>): WebglSocketValue<St> | null {
      const {xyz0, xyz1, illuminant0, illuminant1} = ContrastRatioNode.inputSlots;

      switch (inSocket) {
        case this.colorSockets[0]: 
          if (this.colorSockets[0].effectiveType() === SocketType.ColorCoords) {
            return <WebglSocketValue<St>>{
              [webglOuts.xyz]: xyz0,
              [webglOuts.illuminant]: illuminant0,
            };
          } else {
            return <WebglSocketValue<St>>{
              [webglOuts.val]: xyz0,
            };
          }

        case this.colorSockets[1]: 
          if (this.colorSockets[1].effectiveType() === SocketType.ColorCoords) {
            return <WebglSocketValue<St>>{
              [webglOuts.xyz]: xyz1,
              [webglOuts.illuminant]: illuminant1,
            };
          } else {
            return <WebglSocketValue<St>>{
              [webglOuts.val]: xyz1,
            };
          }

        default:
          return null;
      }
    }
  }

  enum RandomFloatMode {
    FloatSeed = "float seed",
    VectorSeed = "vector seed",
  }
  export class RandomFloatNode extends NodeWithOverloads<RandomFloatMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "randomFloat";
    static readonly outputDisplayType = OutputDisplayType.Float;

    private static readonly inputSlots = WebglSlot.ins("useFloor", "seed", "min", "max");

    static readonly overloadGroup = new OverloadGroup(new Map<RandomFloatMode, Overload<number>>([
      [RandomFloatMode.FloatSeed, new Overload(
        "Float seed",
        node => [
          new InSocket(node, SocketType.Bool, "Integer", false),
          new InSocket(node, SocketType.Float, "Seed", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, SocketType.Float, "Min", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, SocketType.Float, "Max", true, {sliderProps: {hasBounds: false}, defaultValue: 1}),
        ],
        (node, ins) => [
          new OutSocket(node, SocketType.Float, "Value", context => {
            const useFloor = ins[0].inValue(context)
            const min = ins[2].inValue(context) as number;
            const max = ins[3].inValue(context) as number;
      
            // const rng = seedrandom(this.ins[1].inValue(context).toString())
      
            const float = randFloat(ins[1].inValue(context)) * (max - min + (useFloor ? 1 : 0)) + min;
            return useFloor ? Math.floor(float) : float;
          }),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context) => {
          const {float, val} = WebglSlot.outs("float", "val");
          const {useFloor, seed, min, max} = RandomFloatNode.inputSlots;

          return WebglVariables.template`float ${float} = random(${seed}) * (${max} - ${min} + (${useFloor} ? 1. : 0.)) + ${min};
float ${val} = ${useFloor} ? floor(${float}) : ${float};`({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.slot(val)}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.slot(val)},
          })
        },
        <St extends SocketType>(inSocket: InSocket<St>, ins: InSocket[], node: RandomFloatNode) => {
          const {useFloor, seed, min, max} = RandomFloatNode.inputSlots;

          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<St>>{[webglOuts.val]: useFloor};
            case ins[1]: return <WebglSocketValue<St>>{[webglOuts.val]: seed};
            case ins[2]: return <WebglSocketValue<St>>{[webglOuts.val]: min};
            case ins[3]: return <WebglSocketValue<St>>{[webglOuts.val]: max};
            default: return null;
          }
        },
      )],
      
      [RandomFloatMode.VectorSeed, new Overload(
        "Vector seed",
        node => [
          new InSocket(node, SocketType.Bool, "Integer", false),
          new InSocket(node, SocketType.Vector, "Seed", true, {sliderProps: [
            {hasBounds: false},
            {hasBounds: false},
            {hasBounds: false},
          ]}),
          new InSocket(node, SocketType.Float, "Min", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, SocketType.Float, "Max", true, {sliderProps: {hasBounds: false}, defaultValue: 1}),
        ],
        (node, ins) => [
          new OutSocket(node, SocketType.Float, "Value", context => {
            const useFloor = ins[0].inValue(context)
            const min = ins[2].inValue(context) as number;
            const max = ins[3].inValue(context) as number;
          
            const float = randFloatVec3Seed(ins[1].inValue(context)) * (max - min + (useFloor ? 1 : 0)) + min;
            return useFloor ? Math.floor(float) : float;
          }),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context) => {
          const {float, val} = WebglSlot.outs("float", "val");
          const {useFloor, seed, min, max} = RandomFloatNode.inputSlots;

          return WebglVariables.template`float ${float} = random(${seed}) * (${max} - ${min} + (${useFloor} ? 1. : 0.)) + ${min};
float ${val} = ${useFloor} ? floor(${float}) : ${float};`({
            socketOutVariables: new Map([
              [outs[0], {[webglOuts.val]: WebglTemplate.slot(val)}],
            ]),
            nodeOutVariables: {[webglOuts.val]: WebglTemplate.slot(val)},
          });
        },
        <St extends SocketType>(inSocket: InSocket<St>, ins: InSocket[], node: RandomFloatNode) => {
          const {useFloor, seed, min, max} = RandomFloatNode.inputSlots;

          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<St>>{[webglOuts.val]: useFloor};
            case ins[1]: return <WebglSocketValue<St>>{[webglOuts.val]: seed};
            case ins[2]: return <WebglSocketValue<St>>{[webglOuts.val]: min};
            case ins[3]: return <WebglSocketValue<St>>{[webglOuts.val]: max};
            default: return null;
          }
        },
      )],
    ]));


    constructor() {
      super(RandomFloatMode.FloatSeed);
    }
  }
}