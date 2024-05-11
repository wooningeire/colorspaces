import { labSliderProps } from "./spaces";
import { Node, SocketType, NodeEvalContext, OutputDisplayType, OutSocket, InSocket, WebglOutputMapping, webglStdOuts, socketTypeToStdOut } from "../Node";
import * as cm from "../colormanagement";

import { Vec3, lerp } from "@/util";
import { Overload, OverloadGroup, NodeWithOverloads } from "../Overload";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";
import { randFloat, randFloatVec3Seed } from "../colormanagement/random";
import { NO_DESC, StringKey } from "@/strings";
import { vectorOrColorInSocketMapping } from "./util";

export namespace math {
  const singleDisplayValueVec: ConstructorParameters<typeof Overload>[3] =
      (ins, outs, context) => ({
        values: outs[0].outValue(context),
        labels: [],
        flags: [],
      });
  const singleDisplayValueFloat: ConstructorParameters<typeof Overload>[3] =
      (ins, outs, context) => ({
        values: [outs[0].outValue(context)],
        labels: [],
        flags: [],
      });
  const outputsWithNoStatements: ConstructorParameters<typeof Overload>[4] =
      (ins, outs, context, node) => WebglVariables.empty({node});

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

    private static readonly threeValueOverload =
        ({
          label,
          operandLabels,
          outputLabel="label.socket.vector",
          defaultBlendAmount=1,
          calculate,
          getTemplate,
        }: {
          label: StringKey,
          operandLabels: [StringKey, StringKey],
          outputLabel?: StringKey,
          defaultBlendAmount?: number,
          calculate: (fac: number, val0: Vec3, val1: Vec3) => Vec3,
          getTemplate: (inputSlots: typeof VectorArithmeticNode["inputSlots"]) => WebglTemplate,
        }) => {
          const outputs = {[webglStdOuts.vector]: getTemplate(this.inputSlots)};
          
          return new Overload(
            label,
            node => {
              const {fac, val0, val1} = this.inputSlots;
              return [
                new InSocket(node, SocketType.Float, "label.socket.blendAmount", {
                  defaultValue: defaultBlendAmount,
                  webglOutputMapping: {[webglStdOuts.float]: fac},
                }),
                new InSocket(node, SocketType.Vector, operandLabels[0], {webglOutputMapping: {[webglStdOuts.vector]: val0}}),
                new InSocket(node, SocketType.Vector, operandLabels[1], {webglOutputMapping: {[webglStdOuts.vector]: val1}}),
              ];
            },
            (node, ins) => [
              new OutSocket(node, SocketType.Vector, outputLabel, context => calculate(...ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3]), {
                webglOutputs: socket => () => outputs,
              }),
            ],
            singleDisplayValueVec,
            outputsWithNoStatements,
            () => outputs,
          );
        };

    static readonly overloadGroup = new OverloadGroup(new Map<VectorArithmeticMode, Overload>([
      [VectorArithmeticMode.Lerp, this.threeValueOverload({
        label: "label.overload.lerp",
        operandLabels: ["label.socket.start", "label.socket.end"],
        defaultBlendAmount: 0.5,
        calculate: (fac, val0, val1) => val0.map((_, i) => lerp(val0[i], val1[i], fac)) as Vec3,
        getTemplate: ({fac, val0, val1}) => WebglTemplate.source`mix(${val0}, ${val1}, ${fac})`,
      })],

      [VectorArithmeticMode.Add, this.threeValueOverload({
        label: "label.overload.add",
        operandLabels: ["label.socket.addOperand", "label.socket.addOperand"],
        outputLabel: "label.socket.addOut",
        calculate: (fac, val0, val1) => val0.map((_, i) => val0[i] + val1[i] * fac) as Vec3,
        getTemplate: ({fac, val0, val1}) => WebglTemplate.source`${val0} + ${val1} * ${fac}`,
      })],

      [VectorArithmeticMode.Multiply, this.threeValueOverload({
        label: "label.overload.vectorArithmetic.componentwiseMultiply",
        operandLabels: ["label.socket.multiplyOperand", "label.socket.multiplyOperand"],
        outputLabel: "label.socket.multiplyOut",
        calculate: (fac, val0, val1) => val0.map((_, i) => val0[i] * ((1 - fac) + val1[i] * fac)) as Vec3,
        getTemplate: ({fac, val0, val1}) => WebglTemplate.source`${val0} * ((1. - ${fac}) + ${val1} * ${fac})`,
      })],

      [VectorArithmeticMode.Subtract, this.threeValueOverload({
        label: "label.overload.subtract",
        operandLabels: ["label.socket.subtractOperand1", "label.socket.subtractOperand2"],
        outputLabel: "label.socket.subtractOut",
        calculate: (fac, val0, val1) => val0.map((_, i) => val0[i] - val1[i] * fac) as Vec3,
        getTemplate: ({fac, val0, val1}) => WebglTemplate.source`${val0} - ${val1} * ${fac}`,
      })],

      [VectorArithmeticMode.Divide, this.threeValueOverload({
        label: "label.overload.vectorArithmetic.componentwiseMultiply",
        operandLabels: ["label.socket.divideOperand1", "label.socket.divideOperand2"],
        outputLabel: "label.socket.divideOut",
        calculate: (fac, val0, val1) => val0.map((_, i) => val0[i] / ((1 - fac) + val1[i] * fac)) as Vec3,
        getTemplate: ({fac, val0, val1}) => WebglTemplate.source`${val0} / ((1. - ${fac}) + ${val1} * ${fac})`,
      })],

      [VectorArithmeticMode.Screen, this.threeValueOverload({
        label: "label.overload.screen",
        operandLabels: ["label.socket.multiplyOperand", "label.socket.multiplyOperand"],
        outputLabel: "label.socket.multiplyOut",
        calculate: (fac, val0, val1) => val0.map((_, i) => 1 - (1 - val0[i]) * (1 - val1[i] * fac)) as Vec3,
        getTemplate: ({fac, val0, val1}) => WebglTemplate.source`1. - (1. - ${val0}) * (1. - ${val1} * ${fac})`,
      })],
      
      [VectorArithmeticMode.Distance, (() => {
        const {val0, val1} = this.inputSlots;
        const outputs = ({[webglStdOuts.float]: WebglTemplate.source`length(${val0} - ${val1})`});

        return new Overload(
          "label.overload.vectorArithmetic.distance",
          node => {
            return [
              new InSocket(node, SocketType.Vector, "label.socket.vector", {webglOutputMapping: {[webglStdOuts.vector]: val0}}),
              new InSocket(node, SocketType.Vector, "label.socket.vector", {webglOutputMapping: {[webglStdOuts.vector]: val1}}),
            ];
          },
          (node, ins) => [
            new OutSocket(node, SocketType.Float, "label.socket.vectorArithmetic.distance", context => {
              const [val0, val1] = ins.map(socket => socket.inValue(context)) as [Vec3, Vec3];
              return Math.hypot(...val0.map((_, i) => val0[i] - val1[i]));
            }, {
              webglOutputs: socket => () => outputs,
            }),
          ],
          singleDisplayValueVec,
          outputsWithNoStatements,
          () => outputs,
        );
      })()],

      [VectorArithmeticMode.Scale, (() => {
        const {vector, scalar} = this.inputSlots;
        const outputs = ({[webglStdOuts.vector]: WebglTemplate.source`${vector} * ${scalar}`});

        return new Overload(
          "label.overload.vectorArithmetic.scalarMultiply",
          node => {
            return [
              new InSocket(node, SocketType.Vector, "label.socket.vector", {webglOutputMapping: {[webglStdOuts.vector]: vector}}),
              new InSocket(node, SocketType.Float, "label.socket.scalar", {webglOutputMapping: {[webglStdOuts.float]: scalar}}),
            ];
          },
          (node, ins) => [
            new OutSocket(node, SocketType.Vector, "label.socket.vector", context => {
              const [col, scalar] = ins.map(socket => socket.inValue(context)) as [Vec3, number];
              return col.map((_, i) => col[i] * scalar) as Vec3;
            }, {
              webglOutputs: socket => () => outputs,
            }),
          ],
          singleDisplayValueVec,
          outputsWithNoStatements,
          () => outputs,
        )
      })()],
    ]));

    width = 200;

    constructor() {
      super(VectorArithmeticMode.Lerp);
    }
  }


  enum ArithmeticMode {
    Expression = "expression",
    Add = "add",
    Multiply = "multiply",
    Subtract = "subtract",
    Divide = "divide",
    Pow = "pow",
    Screen = "screen",
    Lerp = "lerp",
    MapRange = "mapRange",
    Floor = "floor",
    Sine = "sine",
    Cosine = "cosine",
    Tangent = "tangent",
    Arcsine = "arcsine",
    Arccosine = "arccosine",
    Arctangent = "arctangent",
    Arctangent2 = "arctangent2",
    Hypotenuse = "hypotenuse",
    Quantize = "quantize",
  }
  export class ArithmeticNode extends NodeWithOverloads<ArithmeticMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "arithmetic";
    static readonly outputDisplayType = OutputDisplayType.Float;

    private static readonly inputSlots = WebglSlot.ins("val0", "val1", "min", "max", "fac", "source", "sourceMin", "sourceMax", "targetMin", "targetMax", "val", "nSegments");
    
    width = 200;

    private static readonly singleOutputOverload = <InSockets extends InSocket[]>({
      label,
      ins,
      outputLabel="label.socket.value",
      outputType=SocketType.Float,
      calculate,
      getTemplate,
    }: {
      label: StringKey,
      ins: (...args: Parameters<ConstructorParameters<typeof Overload>[1]>) => [...InSockets],
      outputLabel?: StringKey,
      outputType?: SocketType,
      calculate: (...inputs: {[I in keyof InSockets]: ReturnType<InSockets[I]["inValue"]>}) => number,
      getTemplate: (inputSlots: typeof ArithmeticNode["inputSlots"]) => WebglTemplate,
    }) => {
      const outputs = {[socketTypeToStdOut.get(outputType)!]: getTemplate(this.inputSlots)};

      return new Overload(
        label,
        ins,
        (node, ins) => [
          new OutSocket(node, outputType, outputLabel, context => calculate(...ins.map(socket => socket.inValue(context)) as {[I in keyof InSockets]: ReturnType<InSockets[I]["inValue"]>}), {
            webglOutputs: socket => () => outputs,
          }),
        ],
        singleDisplayValueFloat,
        outputsWithNoStatements,
        () => outputs,
      );
    };

    private static readonly singleInSocketBuilder: ConstructorParameters<typeof Overload>[1] = node => {
      const {val} = this.inputSlots;

      return [
        new InSocket(node, SocketType.Float, "label.socket.value", {
          sliderProps: {hasBounds: false},
          webglOutputMapping: {[webglStdOuts.float]: val},
        }),
      ];
    };

    private static readonly singleOutputTwoInputsOverload = ({
      label,
      operandLabels=["label.socket.value", "label.socket.value"],
      outputLabel="label.socket.value",
      outputType=SocketType.Float,
      calculate,
      getTemplate,
    }: {
      label: StringKey,
      operandLabels?: [StringKey, StringKey],
      outputLabel?: StringKey,
      outputType?: SocketType,
      calculate: (val0: number, val1: number) => number,
      getTemplate: (inputSlots: typeof ArithmeticNode["inputSlots"]) => WebglTemplate,
    }) => this.singleOutputOverload({
      label,
      ins: node => {
        const {val0, val1} = this.inputSlots;
        return [
          new InSocket(node, SocketType.Float, operandLabels[0], {
            sliderProps: {hasBounds: false},
            webglOutputMapping: {[webglStdOuts.float]: val0},
          }),
          new InSocket(node, SocketType.Float, operandLabels[1], {
            sliderProps: {hasBounds: false},
            webglOutputMapping: {[webglStdOuts.float]: val1},
          }),
        ];
      },
      outputLabel,
      outputType,
      calculate,
      getTemplate,
    });

    private static singleOutputSingleInputOverload = ({
      label,
      outputType=SocketType.Float,
      calculate,
      getTemplate,
    }: {
      label: StringKey,
      outputType?: SocketType,
      calculate: (val: number) => number,
      getTemplate: (inputSlots: typeof ArithmeticNode["inputSlots"]) => WebglTemplate,
    }) => this.singleOutputOverload({
      label,
      ins: this.singleInSocketBuilder,
      outputType,
      calculate,
      getTemplate,
    });

    static readonly overloadGroup = new OverloadGroup(new Map<ArithmeticMode, Overload>([
      [ArithmeticMode.Add, this.singleOutputTwoInputsOverload({
        label: "label.overload.add",
        operandLabels: ["label.socket.addOperand", "label.socket.addOperand"],
        outputLabel: "label.socket.addOut",
        calculate: (val0, val1) => val0 + val1,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} + ${val1}`,
      })],

      [ArithmeticMode.Multiply, this.singleOutputTwoInputsOverload({
        label: "label.overload.arithmetic.multiply",
        operandLabels: ["label.socket.multiplyOperand", "label.socket.multiplyOperand"],
        outputLabel: "label.socket.multiplyOut",
        calculate: (val0, val1) => val0 * val1,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} * ${val1}`,
      })],
      
      [ArithmeticMode.Subtract, this.singleOutputTwoInputsOverload({
        label: "label.overload.subtract",
        operandLabels: ["label.socket.subtractOperand1", "label.socket.subtractOperand2"],
        outputLabel: "label.socket.subtractOut",
        calculate: (val0, val1) => val0 - val1,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} - ${val1}`,
      })],
      
      [ArithmeticMode.Divide, this.singleOutputTwoInputsOverload({
        label: "label.overload.arithmetic.divide",
        operandLabels: ["label.socket.divideOperand1", "label.socket.divideOperand2"],
        outputLabel: "label.socket.divideOut",
        calculate: (val0, val1) => val0 / val1,
        getTemplate: ({val0, val1}) => WebglTemplate.source`${val0} / ${val1}`,
      })],
      
      [ArithmeticMode.Pow, this.singleOutputTwoInputsOverload({
        label: "label.overload.arithmetic.power",
        operandLabels: ["label.socket.arithmetic.powerBase", "label.socket.arithmetic.powerExponent"],
        outputLabel: "label.socket.arithmetic.powerOut",
        calculate: (val0, val1) => val0 ** val1,
        getTemplate: ({val0, val1}) => WebglTemplate.source`pow(${val0}, ${val1})`,
      })],
      
      [ArithmeticMode.Screen, this.singleOutputTwoInputsOverload({
        label: "label.overload.screen",
        operandLabels: ["label.socket.multiplyOperand", "label.socket.multiplyOperand"],
        outputLabel: "label.socket.multiplyOut",
        calculate: (val0, val1) => 1 - (1 - val0) * (1 - val1),
        getTemplate: ({val0, val1}) => WebglTemplate.source`1. - (1. - ${val0}) * (1. - ${val1})`,
      })],
      
      [ArithmeticMode.Lerp, this.singleOutputOverload({
        label: "label.overload.lerp",
        ins: node => {
          const {min, max, fac} = this.inputSlots;
          return [
            new InSocket(node, SocketType.Float, "label.socket.min", {
              sliderProps: {hasBounds: false},
              webglOutputMapping: {[webglStdOuts.float]: min},
            }),
            new InSocket(node, SocketType.Float, "label.socket.max", {
              sliderProps: {hasBounds: false},
              webglOutputMapping: {[webglStdOuts.float]: max},
            }),
            new InSocket(node, SocketType.Float, "label.socket.blendAmount", {webglOutputMapping: {[webglStdOuts.float]: fac}}),
          ];
        },
        calculate: lerp,
        getTemplate: ({min, max, fac}) => WebglTemplate.source`mix(${min}, ${max}, ${fac})`,
      })],
          
      [ArithmeticMode.MapRange, this.singleOutputOverload({
        label: "label.overload.arithmetic.mapRange",
        ins: node => {
          const {source, sourceMin, sourceMax, targetMin, targetMax} = this.inputSlots;
          return [
            new InSocket(node, SocketType.Float, "label.socket.arithmetic.mapRange.sourceValue", {
              sliderProps: {hasBounds: false},
              webglOutputMapping: {[webglStdOuts.float]: source},
            }),
            new InSocket(node, SocketType.Float, "label.socket.arithmetic.mapRange.sourceMin", {
              sliderProps: {hasBounds: false},
              webglOutputMapping: {[webglStdOuts.float]: sourceMin},
            }),
            new InSocket(node, SocketType.Float, "label.socket.arithmetic.mapRange.sourceMax", {
              sliderProps: {hasBounds: false},
              webglOutputMapping: {[webglStdOuts.float]: sourceMax},
            }),
            new InSocket(node, SocketType.Float, "label.socket.arithmetic.mapRange.targetMin", {
              sliderProps: {hasBounds: false},
              webglOutputMapping: {[webglStdOuts.float]: targetMin},
            }),
            new InSocket(node, SocketType.Float, "label.socket.arithmetic.mapRange.targetMax", {
              sliderProps: {hasBounds: false},
              webglOutputMapping: {[webglStdOuts.float]: targetMax},
            }),
          ];
        },
        calculate: (value, srcMin, srcMax, dstMin, dstMax) => lerp(dstMin, dstMax, value / (srcMax - srcMin)),
        getTemplate: ({source, sourceMin, sourceMax, targetMin, targetMax}) => WebglTemplate.source`mix(${targetMin}, ${targetMax}, ${source} / (${sourceMax} - ${sourceMin}))`,
      })],
      
      [ArithmeticMode.Floor, this.singleOutputSingleInputOverload({
        label: "label.overload.arithmetic.floor",
        outputType: SocketType.Integer,
        calculate: Math.floor,
        getTemplate: ({val}) => WebglTemplate.source`int(floor(${val}))`,
      })],
      
      [ArithmeticMode.Sine, this.singleOutputSingleInputOverload({
        label: "label.overload.arithmetic.sine",
        calculate: Math.sin,
        getTemplate: ({val}) => WebglTemplate.source`sin(${val})`,
      })],
      
      [ArithmeticMode.Cosine, this.singleOutputSingleInputOverload({
        label: "label.overload.arithmetic.cosine",
        calculate: Math.cos,
        getTemplate: ({val}) => WebglTemplate.source`cos(${val})`,
      })],
      
      [ArithmeticMode.Cosine, this.singleOutputSingleInputOverload({
        label: "label.overload.arithmetic.tangent",
        calculate: Math.tan,
        getTemplate: ({val}) => WebglTemplate.source`tan(${val})`,
      })],
      
      [ArithmeticMode.Arcsine, this.singleOutputSingleInputOverload({
        label: "label.overload.arithmetic.arcsine",
        calculate: Math.asin,
        getTemplate: ({val}) => WebglTemplate.source`asin(${val})`,
      })],
      
      [ArithmeticMode.Arccosine, this.singleOutputSingleInputOverload({
        label: "label.overload.arithmetic.arccosine",
        calculate: Math.acos,
        getTemplate: ({val}) => WebglTemplate.source`acos(${val})`,
      })],
      
      [ArithmeticMode.Arctangent, this.singleOutputSingleInputOverload({
        label: "label.overload.arithmetic.arctangent",
        calculate: Math.atan,
        getTemplate: ({val}) => WebglTemplate.source`atan(${val})`,
      })],
      
      [ArithmeticMode.Arctangent2, this.singleOutputTwoInputsOverload({
        label: "label.overload.arithmetic.arctangent2",
        operandLabels: ["label.socket.y", "label.socket.x"],
        calculate: Math.atan2,
        getTemplate: ({val0, val1}) => WebglTemplate.source`atan(${val1}, ${val0})`,
      })],
      
      [ArithmeticMode.Hypotenuse, this.singleOutputTwoInputsOverload({
        label: "label.overload.arithmetic.hypotenuse",
        outputLabel: "label.socket.arithmetic.hypotenuse",
        calculate: Math.hypot,
        getTemplate: ({val0, val1}) => WebglTemplate.source`sqrt(${val0} * ${val0} + ${val1} * ${val1})`,
      })],
      
      [ArithmeticMode.Quantize, this.singleOutputOverload({
        label: "label.overload.arithmetic.quantize",
        ins: node => {
          const {val, nSegments} = this.inputSlots;
          return [
            new InSocket(node, SocketType.Float, "label.socket.value", {
              sliderProps: {hasBounds: false},
              webglOutputMapping: {[webglStdOuts.float]: val},
            }),
            new InSocket(node, SocketType.Float, "label.socket.arithmetic.quantize.nSegments", {
              sliderProps: {hasBounds: false, step: 1},
              defaultValue: 4,
              webglOutputMapping: {[webglStdOuts.float]: nSegments},
            }),
          ];
        },
        calculate: (value, nSegments) => Math.floor(value * nSegments) / nSegments,
        getTemplate: ({val, nSegments}) => WebglTemplate.source`floor(${val} * ${nSegments}) / (${nSegments} - 1.)`,
      })],
    ]));

    constructor() {
      super(ArithmeticMode.Add);
    }
  }

  export class VectorNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "vector";

    private static readonly inputSlots = WebglSlot.ins("x", "y", "z");

    constructor() {
      super();

      const {x, y, z} = VectorNode.inputSlots;

      this.ins.push(
        new InSocket(this, SocketType.Float, NO_DESC, {
          sliderProps: {
            hasBounds: false,
          },
          webglOutputMapping: {[webglStdOuts.float]: x},
        }),
        new InSocket(this, SocketType.Float, NO_DESC, {
          sliderProps: {
            hasBounds: false,
          },
          webglOutputMapping: {[webglStdOuts.float]: y},
        }),
        new InSocket(this, SocketType.Float, NO_DESC, {
          sliderProps: {
            hasBounds: false,
          },
          webglOutputMapping: {[webglStdOuts.float]: z},
        }),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Vector, "label.socket.vector", context => this.ins.map(socket => socket.inValue(context)) as Vec3, {
          webglOutputs: socket => () => ({[webglStdOuts.vector]: WebglTemplate.source`vec3(${x}, ${y}, ${z})`}),
        }),
      );
    }
  }

  export class SplitVectorNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "splitVector";

    private readonly inSocket: InSocket<SocketType.Vector>;

    private static readonly inputSlots = WebglSlot.ins("vec");

    constructor() {
      super();

      const {vec} = SplitVectorNode.inputSlots;

      this.ins.push(
        (this.inSocket = new InSocket(this, SocketType.Vector, "label.socket.vector", {webglOutputMapping: {[webglStdOuts.vector]: vec}})),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Float, "label.socket.1", context => this.inSocket.inValue(context)[0], {
          webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.source`${vec}.x`}),
        }),
        new OutSocket(this, SocketType.Float, "label.socket.2", context => this.inSocket.inValue(context)[1], {
          webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.source`${vec}.y`}),
        }),
        new OutSocket(this, SocketType.Float, "label.socket.3", context => this.inSocket.inValue(context)[2], {
          webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.source`${vec}.z`}),
        }),
      );
    }
  }

  enum ColorDifferenceMode {
    DeltaE1976 = "deltae1976",
    DeltaE2000 = "deltae2000",
  }

  
  const getXyzTemplate = (socket: InSocket, {colorSlot, vectorSlot}: {colorSlot: WebglSlot, vectorSlot: WebglSlot}) =>
      socket.effectiveType() === SocketType.Vector
          ? WebglTemplate.slot(vectorSlot)
          : WebglTemplate.source`${colorSlot}.xyz`;
  const getIlluminantTemplate = (socket: InSocket, {colorSlot}: {colorSlot: WebglSlot}) =>
      socket.effectiveType() === SocketType.Vector
          ? WebglTemplate.string("illuminant2_E")
          : WebglTemplate.source`${colorSlot}.illuminant`;
  export class ColorDifferenceNode extends NodeWithOverloads<ColorDifferenceMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "colorDifference";
    static readonly outputDisplayType: OutputDisplayType = OutputDisplayType.Float;

    private static readonly inputSlots = WebglSlot.ins("vec0", "col0", "vec1", "col1");
    private static readonly outputSlots = WebglSlot.outs("difference");

    static readonly overloadGroup = new OverloadGroup(new Map<ColorDifferenceMode, Overload>([
      [ColorDifferenceMode.DeltaE1976, (() => {
        const {vec0, col0, vec1, col1} = this.inputSlots;
        const {difference} = this.outputSlots;

        return new Overload(
          "label.overload.colorDifference.deltaE1976",
          node => {
            return [
              new InSocket(node, SocketType.VectorOrColor, "label.socket.cielabOrColor", {
                sliderProps: labSliderProps,
                webglGetOutputMapping: vectorOrColorInSocketMapping({colorSlot: col0, vectorSlot: vec0}),
              }),
              new InSocket(node, SocketType.VectorOrColor, "label.socket.cielabOrColor", {
                sliderProps: labSliderProps,
                webglGetOutputMapping: vectorOrColorInSocketMapping({colorSlot: col1, vectorSlot: vec1}),
              }),
            ];
          },
          (node, ins) => [
            new OutSocket(node, SocketType.Float, "label.socket.colorDifference.difference", context => {
              const val0 = ins[0].inValue(context);
              const val1 = ins[1].inValue(context);
    
              return cm.difference.deltaE1976(val0, val1);
            }, {
              webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.slot(difference)}),
            }),
          ],
          singleDisplayValueFloat,
          (ins, outs, context, node) => WebglVariables.templateConcat`float ${difference} = deltaE1976(${
            getXyzTemplate(ins[0], {colorSlot: col0, vectorSlot: vec0})
          }, ${
            getIlluminantTemplate(ins[0], {colorSlot: col0})
          }, ${
            getXyzTemplate(ins[1], {colorSlot: col1, vectorSlot: vec1})
          }, ${
            getIlluminantTemplate(ins[1], {colorSlot: col1})
          });`({
            node,
          }),
          () => ({[webglStdOuts.float]: WebglTemplate.slot(difference)}),
        );
      })()],
      
      [ColorDifferenceMode.DeltaE2000, (() => {
        const {vec0, col0, vec1, col1} = this.inputSlots;
        const {difference} = this.outputSlots;

        return new Overload(
          "label.overload.colorDifference.deltaE2000",
          node => [
            new InSocket(node, SocketType.VectorOrColor, "label.socket.colorDifference.sampleCielabOrColor", {
              sliderProps: labSliderProps,
              webglGetOutputMapping: vectorOrColorInSocketMapping({colorSlot: col0, vectorSlot: vec0}),
            }),
            new InSocket(node, SocketType.VectorOrColor, "label.socket.colorDifference.targetCielabOrColor", {
              sliderProps: labSliderProps,
              webglGetOutputMapping: vectorOrColorInSocketMapping({colorSlot: col1, vectorSlot: vec1}),
            }),
          ],
          (node, ins) => [
            new OutSocket(node, SocketType.Float, "label.socket.colorDifference.difference", context => {
              const val0 = ins[0].inValue(context);
              const val1 = ins[1].inValue(context);
    
              return cm.difference.deltaE2000(val0, val1);
            }, {
              webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.slot(difference)}),
            }),
          ],
          (ins, outs, context) => ({
            values: [outs[0].outValue(context)],
            labels: [],
            flags: [],
          }),
          (ins, outs, context, node) => WebglVariables.templateConcat`float ${difference} = deltaE2000(${
            getXyzTemplate(ins[0], {colorSlot: col0, vectorSlot: vec0})
          }, ${
            getIlluminantTemplate(ins[0], {colorSlot: col0})
          }, ${
            getXyzTemplate(ins[1], {colorSlot: col1, vectorSlot: vec1})
          }, ${
            getIlluminantTemplate(ins[1], {colorSlot: col1})
          });`({
            node,
          }),
          () => ({[webglStdOuts.float]: WebglTemplate.slot(difference)}),
        );
      })()],
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

    private static readonly inputSlots = WebglSlot.ins("vec0", "col0", "vec1", "col1");
    private static readonly outputSlots = WebglSlot.outs("contrastRatio");

    width = 180;

    constructor() {
      super();

      const {vec0, col0, vec1, col1} = ContrastRatioNode.inputSlots;
      const {contrastRatio} = ContrastRatioNode.outputSlots;

      this.ins.push(
        ...(this.colorSockets = [
          new InSocket(this, SocketType.VectorOrColor, "label.socket.xyzOrColor", {
            webglGetOutputMapping: vectorOrColorInSocketMapping({colorSlot: col0, vectorSlot: vec0}),
          }),
          new InSocket(this, SocketType.VectorOrColor, "label.socket.xyzOrColor", {
            webglGetOutputMapping: vectorOrColorInSocketMapping({colorSlot: col1, vectorSlot: vec1}),
          }),
        ]),
      );

      const calculateContrastRatio = (context: NodeEvalContext) => {
        const val0 = this.colorSockets[0].inValue(context);
        const val1 = this.colorSockets[1].inValue(context);

        return cm.difference.contrastRatio(val0, val1);
      };

      const checkContrastRatioPassesThreshold = (threshold: number) => (context: NodeEvalContext) => calculateContrastRatio(context) >= threshold;

      this.outs.push(
        new OutSocket(this, SocketType.Float, "label.socket.contrastRatio.ratio", calculateContrastRatio, {
          webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.slot(contrastRatio)}),
        }),
        new OutSocket(this, SocketType.Bool, "label.socket.contrastRatio.aaaBody?", checkContrastRatioPassesThreshold(7), {
          webglOutputs: socket => () => ({[webglStdOuts.bool]: WebglTemplate.source`${contrastRatio} > 7.`}),
        }),
        new OutSocket(this, SocketType.Bool, "label.socket.contrastRatio.aaaLarge?", checkContrastRatioPassesThreshold(4.5), {
          webglOutputs: socket => () => ({[webglStdOuts.bool]: WebglTemplate.source`${contrastRatio} > 4.5`}),
        }),
        new OutSocket(this, SocketType.Bool, "label.socket.contrastRatio.aaBody?", checkContrastRatioPassesThreshold(4.5), {
          webglOutputs: socket => () => ({[webglStdOuts.bool]: WebglTemplate.source`${contrastRatio} > 4.5`}),
        }),
        new OutSocket(this, SocketType.Bool, "label.socket.contrastRatio.aaLarge?", checkContrastRatioPassesThreshold(3), {
          webglOutputs: socket => () => ({[webglStdOuts.bool]: WebglTemplate.source`${contrastRatio} > 3.`}),
        }),
        new OutSocket(this, SocketType.Bool, "label.socket.contrastRatio.aaUi?", checkContrastRatioPassesThreshold(3), {
          webglOutputs: socket => () => ({[webglStdOuts.bool]: WebglTemplate.source`${contrastRatio} > 3.`}),
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

    webglBaseVariables(): WebglVariables {
      const {vec0, col0, vec1, col1} = ContrastRatioNode.inputSlots;
      const {contrastRatio} = ContrastRatioNode.outputSlots;

      return WebglVariables.templateConcat`float ${contrastRatio} = contrastRatio(${
        getXyzTemplate(this.ins[0], {colorSlot: col0, vectorSlot: vec0})
      }, ${
        getIlluminantTemplate(this.ins[0], {colorSlot: col0})
      }, ${
        getXyzTemplate(this.ins[1], {colorSlot: col1, vectorSlot: vec1})
      }, ${
        getIlluminantTemplate(this.ins[1], {colorSlot: col1})
      });`({
        node: this,
      });
    }

    webglOutputs() {
      const {contrastRatio} = ContrastRatioNode.outputSlots;

      return {
        [webglStdOuts.float]: WebglTemplate.slot(contrastRatio),
      };
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
    private static readonly outputSlots = WebglSlot.outs("float", "flooredFloat");

    static readonly overloadGroup = new OverloadGroup(new Map<RandomFloatMode, Overload>([
      [RandomFloatMode.FloatSeed, (() => {
        const {useFloor, seed, min, max} = this.inputSlots;
        const {float, flooredFloat} = this.outputSlots;

        return new Overload(
          "label.overload.randomFloat.floatSeed",
          node => [
            new InSocket(node, SocketType.Bool, "label.socket.randomFloat.integersOnly?", {
              webglOutputMapping: {[webglStdOuts.bool]: useFloor},
            }),
            new InSocket(node, SocketType.Float, "label.socket.randomFloat.seed", {
              sliderProps: {hasBounds: false},
              webglOutputMapping: {[webglStdOuts.float]: seed},
            }),
            new InSocket(node, SocketType.Float, "label.socket.min", {
              sliderProps: {hasBounds: false},
              webglOutputMapping: {[webglStdOuts.float]: min},
            }),
            new InSocket(node, SocketType.Float, "label.socket.max", {
              sliderProps: {hasBounds: false},
              defaultValue: 1,
              webglOutputMapping: {[webglStdOuts.float]: max},
            }),
          ],
          (node, ins) => [
            new OutSocket(node, SocketType.Float, "label.socket.value", context => {
              const useFloor = ins[0].inValue(context)
              const min = ins[2].inValue(context) as number;
              const max = ins[3].inValue(context) as number;
        
              // const rng = seedrandom(this.ins[1].inValue(context).toString())
        
              const float = randFloat(ins[1].inValue(context)) * (max - min + (useFloor ? 1 : 0)) + min;
              return useFloor ? Math.floor(float) : float;
            }, {
              webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.slot(flooredFloat)}),
            }),
          ],
          (ins, outs, context) => ({
            values: [outs[0].outValue(context)],
            labels: [],
            flags: [],
          }),
          (ins, outs, context, node) =>
              WebglVariables.template`float ${float} = random(${seed}) * (${max} - ${min} + (${useFloor} ? 1. : 0.)) + ${min};
float ${flooredFloat} = ${useFloor} ? floor(${float}) : ${float};`({
                node,
              }),
          () => ({[webglStdOuts.float]: WebglTemplate.slot(flooredFloat)}),
        )
      })()],
      
      [RandomFloatMode.VectorSeed, (() => {
        const {useFloor, seed, min, max} = this.inputSlots;
        const {float, flooredFloat} = this.outputSlots;

        return new Overload(
          "label.overload.randomFloat.vectorSeed",
          node => [
            new InSocket(node, SocketType.Bool, "label.socket.randomFloat.integersOnly?", {
              webglOutputMapping: {[webglStdOuts.bool]: useFloor},
            }),
            new InSocket(node, SocketType.Vector, "label.socket.randomFloat.seed", {
              sliderProps: [
                {hasBounds: false},
                {hasBounds: false},
                {hasBounds: false},
              ],
              webglOutputMapping: {[webglStdOuts.vector]: seed},
            }),
            new InSocket(node, SocketType.Float, "label.socket.min", {
              sliderProps: {hasBounds: false},
              webglOutputMapping: {[webglStdOuts.float]: min},
            }),
            new InSocket(node, SocketType.Float, "label.socket.max", {
              sliderProps: {hasBounds: false},
              defaultValue: 1,
              webglOutputMapping: {[webglStdOuts.float]: max},
            }),
          ],
          (node, ins) => [
            new OutSocket(node, SocketType.Float, "label.socket.value", context => {
              const useFloor = ins[0].inValue(context)
              const min = ins[2].inValue(context) as number;
              const max = ins[3].inValue(context) as number;
            
              const float = randFloatVec3Seed(ins[1].inValue(context)) * (max - min + (useFloor ? 1 : 0)) + min;
              return useFloor ? Math.floor(float) : float;
            }, {
              webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.slot(flooredFloat)}),
            }),
          ],
          (ins, outs, context) => ({
            values: [outs[0].outValue(context)],
            labels: [],
            flags: [],
          }),
          (ins, outs, context, node) =>
              WebglVariables.template`float ${float} = random(${seed}) * (${max} - ${min} + (${useFloor} ? 1. : 0.)) + ${min};
float ${flooredFloat} = ${useFloor} ? floor(${float}) : ${float};`({
                node,
              }),
          () => ({[webglStdOuts.float]: WebglTemplate.slot(flooredFloat)}),
        );
      })()],
    ]));


    constructor() {
      super(RandomFloatMode.FloatSeed);
    }
  }

  export class WellKnownConstantsNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "wellKnownConstants";

    constructor() {
      super();

      this.outs.push(
        new OutSocket(this, SocketType.Float, "label.socket.wellKnownConstants.pi", () => Math.PI, {
          webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.string(`PI`)}),
        }),
        new OutSocket(this, SocketType.Float, "label.socket.wellKnownConstants.rev", () => 2 * Math.PI, {
          webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.string(`REV`)}),
        }),
      );
    }
  }
}