import seedrandom from "seedrandom";

import { labSliderProps } from "./spaces";
import { Node, Socket, SocketType as St, NodeEvalContext, OutputDisplayType, OutSocket, InSocket, WebglSocketValue } from "../Node";
import * as cm from "../colormanagement";

import { Color, Vec3, lerp } from "@/util";
import { Overload, OverloadGroup, NodeWithOverloads } from "../Overload";
import { WebglVariables } from "@/webgl-compute/WebglVariables";
import { randFloat, randFloatVec3Seed } from "../colormanagement/random";

export namespace math {
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

    private static threeValueMapping: ConstructorParameters<typeof Overload<VectorArithmeticMode>>[5] =
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: VectorArithmeticMode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "fac"};
            case ins[1]: return <WebglSocketValue<T>>{"val": "val0"};
            case ins[2]: return <WebglSocketValue<T>>{"val": "val1"};
            default: return null;
          }
        };

    static readonly overloadGroup = new OverloadGroup(new Map<VectorArithmeticMode, Overload<Vec3 | number>>([
      [VectorArithmeticMode.Lerp, new Overload(
        "Lerp",
        node => [
          new InSocket(node, Socket.Type.Float, "Blend amount", true, {defaultValue: 0.5}),
          new InSocket(node, Socket.Type.Vector, "Start"),
          new InSocket(node, Socket.Type.Vector, "End"),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Vector, "Vector", context => {
            const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
            return col0.map((_, i) => lerp(col0[i], col1[i], fac)) as Vec3;
          }),
        ],
        (ins, outs, context) => ({
          values: outs[0].outValue(context),
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "mix({val0}, {val1}, {fac})"}],
            [outs[0], {"val": "mix({val0}, {val1}, {fac})"}],
          ]),
        ),
        this.threeValueMapping,
      )],

      [VectorArithmeticMode.Add, new Overload(
        "Add",
        node => [
          new InSocket(node, Socket.Type.Float, "Blend amount", true, {defaultValue: 1}),
          new InSocket(node, Socket.Type.Vector, "Addend"),
          new InSocket(node, Socket.Type.Vector, "Addend"),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Vector, "Sum", context => {
            const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
            return col0.map((_, i) => col0[i] + col1[i] * fac) as Vec3;
          }),
        ],
        (ins, outs, context) => ({
          values: outs[0].outValue(context),
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "{val0} + {val1} * {fac}"}],
            [outs[0], {"val": "{val0} + {val1} * {fac}"}],
          ]),
        ),
        this.threeValueMapping,
      )],

      [VectorArithmeticMode.Multiply, new Overload(
        "Componentwise multiply",
        node => [
          new InSocket(node, Socket.Type.Float, "Blend amount", true, {defaultValue: 1}),
          new InSocket(node, Socket.Type.Vector, "Factor"),
          new InSocket(node, Socket.Type.Vector, "Factor"),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Vector, "Product", context => {
            const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
            return col0.map((_, i) => col0[i] * ((1 - fac) + col1[i] * fac)) as Vec3;
          }),
        ],
        (ins, outs, context) => ({
          values: outs[0].outValue(context),
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "{val0} * ((1. - {fac}) + {val1} * {fac})"}],
            [outs[0], {"val": "{val0} * ((1. - {fac}) + {val1} * {fac})"}],
          ]),
        ),
        this.threeValueMapping,
      )],

      [VectorArithmeticMode.Subtract, new Overload(
        "Subtract",
        node => [
          new InSocket(node, Socket.Type.Float, "Blend amount", true, {defaultValue: 1}),
          new InSocket(node, Socket.Type.Vector, "Minuend"),
          new InSocket(node, Socket.Type.Vector, "Subtrahend"),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Vector, "Difference", context => {
            const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
            return col0.map((_, i) => col0[i] - col1[i] * fac) as Vec3;
          }),
        ],
        (ins, outs, context) => ({
          values: outs[0].outValue(context),
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "{val0} - {val1} * {fac}"}],
            [outs[0], {"val": "{val0} - {val1} * {fac}"}],
          ]),
        ),
        this.threeValueMapping,
      )],

      [VectorArithmeticMode.Divide, new Overload(
        "Componentwise divide",
        node => [
          new InSocket(node, Socket.Type.Float, "Blend amount", true, {defaultValue: 1}),
          new InSocket(node, Socket.Type.Vector, "Dividend"),
          new InSocket(node, Socket.Type.Vector, "Divisor"),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Vector, "Quotient", context => {
            const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
            return col0.map((_, i) => col0[i] / ((1 - fac) + col1[i] * fac)) as Vec3;
          }),
        ],
        (ins, outs, context) => ({
          values: outs[0].outValue(context),
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "{val0} / ((1. - {fac}) + {val1} * {fac})"}],
            [outs[0], {"val": "{val0} / ((1. - {fac}) + {val1} * {fac})"}],
          ]),
        ),
        this.threeValueMapping,
      )],

      [VectorArithmeticMode.Screen, new Overload(
        "Screen",
        node => [
          new InSocket(node, Socket.Type.Float, "Blend amount", true, {defaultValue: 1}),
          new InSocket(node, Socket.Type.Vector, "Factor"),
          new InSocket(node, Socket.Type.Vector, "Factor"),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Vector, "Product", context => {
            const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
            return col0.map((_, i) => 1 - (1 - col0[i]) * (1 - col1[i] * fac)) as Vec3;
          }),
        ],
        (ins, outs, context) => ({
          values: outs[0].outValue(context),
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, { "val": "1. - (1. - {val0}) * (1. - {val1} * {fac})"}],
            [outs[0], { "val": "1. - (1. - {val0}) * (1. - {val1} * {fac})"}],
          ]),
        ),
        this.threeValueMapping,
      )],

      [VectorArithmeticMode.Distance, new Overload(
        "Distance",
        node => [
          new InSocket(node, Socket.Type.Vector, "Vector"),
          new InSocket(node, Socket.Type.Vector, "Vector"),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Distance", context => {
            const [col0, col1] = ins.map(socket => socket.inValue(context)) as [Vec3, Vec3];
            return Math.hypot(...col0.map((_, i) => col0[i] - col1[i]));
          }),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "length({val0} - {val1})"}],
            [outs[0], {"val": "length({val0} - {val1})"}],
          ]),
        ),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: VectorArithmeticNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "val0"};
            case ins[1]: return <WebglSocketValue<T>>{"val": "val1"};
            default: return null;
          }
        },
      )],

      [VectorArithmeticMode.Scale, new Overload(
        "Scalar multiply",
        node => [
          new InSocket(node, Socket.Type.Vector, "Vector"),
          new InSocket(node, Socket.Type.Float, "Scalar"),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Vector, "Vector", context => {
            const [col, scalar] = ins.map(socket => socket.inValue(context)) as [Vec3, number];
            return col.map((_, i) => col[i] * scalar) as Vec3;
          }),
        ],
        (ins, outs, context) => ({
          values: outs[0].outValue(context),
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "{vector} * {scalar}"}],
            [outs[0], {"val": "{vector} * {scalar}"}],
          ]),
        ),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: VectorArithmeticNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "vector"};
            case ins[1]: return <WebglSocketValue<T>>{"val": "scalar"};
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
  }
  export class ArithmeticNode extends NodeWithOverloads<ArithmeticMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "arithmetic";
    static readonly outputDisplayType = OutputDisplayType.Float;

    private static twoValueMapping: ConstructorParameters<typeof Overload<ArithmeticNode>>[5] =
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: VectorArithmeticMode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "val0"};
            case ins[1]: return <WebglSocketValue<T>>{"val": "val1"};
            default: return null;
          }
        };

    static readonly overloadGroup = new OverloadGroup(new Map<ArithmeticMode, Overload<number>>([
      [ArithmeticMode.Add, new Overload(
        "Add",
        node => [
          new InSocket(node, Socket.Type.Float, "Addend", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, Socket.Type.Float, "Addend", true, {sliderProps: {hasBounds: false}}),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Sum", context => ins[0].inValue(context) + ins[1].inValue(context)),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "{val0} + {val1}"}],
            [outs[0], {"val": "{val0} + {val1}"}],
          ]),
        ),
        this.twoValueMapping,
      )],
      
      [ArithmeticMode.Multiply, new Overload(
        "Multiply",
        node => [
          new InSocket(node, Socket.Type.Float, "Factor", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, Socket.Type.Float, "Factor", true, {sliderProps: {hasBounds: false}}),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Product", context => ins[0].inValue(context) * ins[1].inValue(context)),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "{val0} * {val1}"}],
            [outs[0], {"val": "{val0} * {val1}"}],
          ]),
        ),
        this.twoValueMapping,
      )],
      
      [ArithmeticMode.Subtract, new Overload(
        "Subtract",
        node => [
          new InSocket(node, Socket.Type.Float, "Minuend", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, Socket.Type.Float, "Subtrahend", true, {sliderProps: {hasBounds: false}}),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Difference", context => ins[0].inValue(context) - ins[1].inValue(context)),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "{val0} - {val1}"}],
            [outs[0], {"val": "{val0} - {val1}"}],
          ]),
        ),
        this.twoValueMapping,
      )],
      
      [ArithmeticMode.Divide, new Overload(
        "Divide",
        node => [
          new InSocket(node, Socket.Type.Float, "Dividend", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, Socket.Type.Float, "Divisor", true, {sliderProps: {hasBounds: false}}),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Quotient", context => ins[0].inValue(context) / ins[1].inValue(context)),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "{val0} / {val1}"}],
            [outs[0], {"val": "{val0} / {val1}"}],
          ]),
        ),
        this.twoValueMapping,
      )],
      
      [ArithmeticMode.Pow, new Overload(
        "Power",
        node => [
          new InSocket(node, Socket.Type.Float, "Base", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, Socket.Type.Float, "Exponent", true, {sliderProps: {hasBounds: false}}),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Power", context => ins[0].inValue(context) ** ins[1].inValue(context)),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "pow({val0}, {val1})"}],
            [outs[0], {"val": "pow({val0}, {val1})"}],
          ]),
        ),
        this.twoValueMapping,
      )],
      
      [ArithmeticMode.Screen, new Overload(
        "Screen",
        node => [
          new InSocket(node, Socket.Type.Float, "Factor", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, Socket.Type.Float, "Factor", true, {sliderProps: {hasBounds: false}}),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Product", context => 1 - (1 - ins[0].inValue(context)) * (1 - ins[1].inValue(context))),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "1. - (1. - {val0}) * (1. - {val1})"}],
            [outs[0], {"val": "1. - (1. - {val0}) * (1. - {val1})"}],
          ]),
        ),
        this.twoValueMapping,
      )],
      
      [ArithmeticMode.Lerp, new Overload(
        "Lerp",
        node => [
          new InSocket(node, Socket.Type.Float, "Min", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, Socket.Type.Float, "Max", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, Socket.Type.Float, "Amount"),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Value", context => lerp(ins[0].inValue(context), ins[1].inValue(context), ins[2].inValue(context))),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "mix({min}, {max}, {fac})"}],
            [outs[0], {"val": "mix({min}, {max}, {fac})"}],
          ]),
        ),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: VectorArithmeticNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "min"};
            case ins[1]: return <WebglSocketValue<T>>{"val": "max"};
            case ins[2]: return <WebglSocketValue<T>>{"val": "fac"};
            default: return null;
          }
        },
      )],
      
      [ArithmeticMode.MapRange, new Overload(
        "Map range",
        node => [
          new InSocket(node, Socket.Type.Float, "Source value", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, Socket.Type.Float, "Source min", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, Socket.Type.Float, "Source max", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, Socket.Type.Float, "Target min", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, Socket.Type.Float, "Target max", true, {sliderProps: {hasBounds: false}}),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Target value", context => {
            return lerp(ins[3].inValue(context), ins[4].inValue(context), ins[0].inValue(context) / (ins[2].inValue(context) - ins[1].inValue(context)));
          }),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "mix({targetMin}, {targetMax}, {source} / ({sourceMax} - {sourceMin}))"}],
            [outs[0], {"val": "mix({targetMin}, {targetMax}, {source} / ({sourceMax} - {sourceMin}))"}],
          ]),
        ),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: VectorArithmeticNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "source"};
            case ins[1]: return <WebglSocketValue<T>>{"val": "sourceMin"};
            case ins[2]: return <WebglSocketValue<T>>{"val": "sourceMax"};
            case ins[3]: return <WebglSocketValue<T>>{"val": "targetMin"};
            case ins[4]: return <WebglSocketValue<T>>{"val": "targetMax"};
            default: return null;
          }
        },
      )],
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
        new InSocket(this, Socket.Type.Float, "", true, {
          sliderProps: {
            hasBounds: false,
          },
        }),
        new InSocket(this, Socket.Type.Float, "", true, {
          sliderProps: {
            hasBounds: false,
          },
        }),
        new InSocket(this, Socket.Type.Float, "", true, {
          sliderProps: {
            hasBounds: false,
          },
        }),
      );

      this.outs.push(
        new OutSocket(this, Socket.Type.Vector, "Vector", context => this.ins.map(socket => socket.inValue(context)) as Vec3),
      );
    }

    webglGetBaseVariables(): WebglVariables {
      return new WebglVariables(
        "",
        new Map([
          [this.outs[0], {"val": "vec3({x}, {y}, {z})"}],
        ])
      );
    }
    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      switch (inSocket) {
        case this.ins[0]: return <WebglSocketValue<T>>{"val": "x"};
        case this.ins[1]: return <WebglSocketValue<T>>{"val": "y"};
        case this.ins[2]: return <WebglSocketValue<T>>{"val": "z"};
        default: return null;
      }
    }
  }

  export class SplitVectorNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "splitVector";

    private readonly inSocket: InSocket<St.Vector>;

    constructor() {
      super();

      this.ins.push(
        (this.inSocket = new InSocket(this, Socket.Type.Vector, "Vector")),
      );

      this.outs.push(
        new OutSocket(this, Socket.Type.Float, "1", context => this.inSocket.inValue(context)[0]),
        new OutSocket(this, Socket.Type.Float, "2", context => this.inSocket.inValue(context)[1]),
        new OutSocket(this, Socket.Type.Float, "3", context => this.inSocket.inValue(context)[2]),
      );
    }

    webglGetBaseVariables(): WebglVariables {
      return new WebglVariables(
        "",
        new Map([
          [this.outs[0], {"val": "{vec}.x"}],
          [this.outs[1], {"val": "{vec}.y"}],
          [this.outs[2], {"val": "{vec}.z"}],
        ]),
      );
    }
    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      switch (inSocket) {
        case this.ins[0]: return <WebglSocketValue<T>>{"val": "vec"};
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

    static readonly overloadGroup = new OverloadGroup(new Map<ColorDifferenceMode, Overload<Color | number>>([
      [ColorDifferenceMode.DeltaE1976, new Overload(
        "ΔE* 1976",
        node => [
          new InSocket(node, St.VectorOrColor, "L*a*b* or color", true, {
            sliderProps: labSliderProps,
          }),
          new InSocket(node, St.VectorOrColor, "L*a*b* or color", true, {
            sliderProps: labSliderProps,
          }),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Difference", context => {
            const col0 = ins[0].inValue(context);
            const col1 = ins[1].inValue(context);
  
            return cm.difference.deltaE1976(col0, col1);
          }),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context) => {
          const illuminant0 = ins[0].effectiveType() === St.Vector
              ? "illuminant2_E"
              : "{illuminant0}"
          const illuminant1 = ins[1].effectiveType() === St.Vector
              ? "illuminant2_E"
              : "{illuminant1}"
    
          return new WebglVariables(
            `float {0:difference} = deltaE1976({xyz0}, ${illuminant0}, {xyz1}, ${illuminant1});`,
            new Map([
              [null, {"val": "{0:difference}"}],
              [outs[0], {"val": "{0:difference}"}],
            ]),
          ).nameVariableSlots(1);
        },
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: ColorDifferenceNode) => {
          switch (inSocket) {
            case ins[0]: 
              if (ins[0].effectiveType() === St.ColorCoords) {
                return <WebglSocketValue<T>>{
                  "xyz": "xyz0",
                  "illuminant": "illuminant0",
                };
              } else {
                return <WebglSocketValue<T>>{
                  "val": "xyz0",
                };
              }
    
            case ins[1]: 
              if (ins[1].effectiveType() === St.ColorCoords) {
                return <WebglSocketValue<T>>{
                  "xyz": "xyz1",
                  "illuminant": "illuminant1",
                };
              } else {
                return <WebglSocketValue<T>>{
                  "val": "xyz1",
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
          new InSocket(node, St.VectorOrColor, "Sample L*a*b* or color", true, {
            sliderProps: labSliderProps,
          }),
          new InSocket(node, St.VectorOrColor, "Target L*a*b* or color", true, {
            sliderProps: labSliderProps,
          }),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Difference", context => {
            const col0 = ins[0].inValue(context);
            const col1 = ins[1].inValue(context);
  
            return cm.difference.deltaE2000(col0, col1);
          }),
        ],
        (ins, outs, context) => ({
          values: [outs[0].outValue(context)],
          labels: [],
          flags: [],
        }),
        (ins, outs, context) => {
          const illuminant0 = ins[0].effectiveType() === St.Vector
              ? "illuminant2_E"
              : "{illuminant0}"
          const illuminant1 = ins[1].effectiveType() === St.Vector
              ? "illuminant2_E"
              : "{illuminant1}"
    
          return new WebglVariables(
            `float {0:difference} = deltaE2000({xyz0}, ${illuminant0}, {xyz1}, ${illuminant1});`,
            new Map([
              [null, {"val": "{0:difference}"}],
              [outs[0], {"val": "{0:difference}"}],
            ]),
          ).nameVariableSlots(1);
        },
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: ColorDifferenceNode) => {
          switch (inSocket) {
            case ins[0]: 
              if (ins[0].effectiveType() === St.ColorCoords) {
                return <WebglSocketValue<T>>{
                  "xyz": "xyz0",
                  "illuminant": "illuminant0",
                };
              } else {
                return <WebglSocketValue<T>>{
                  "val": "xyz0",
                };
              }
    
            case ins[1]: 
              if (ins[1].effectiveType() === St.ColorCoords) {
                return <WebglSocketValue<T>>{
                  "xyz": "xyz1",
                  "illuminant": "illuminant1",
                };
              } else {
                return <WebglSocketValue<T>>{
                  "val": "xyz1",
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

    private readonly colorSockets: InSocket<St.VectorOrColor>[];

    constructor() {
      super();

      this.ins.push(
        ...(this.colorSockets = [
          new InSocket(this, Socket.Type.VectorOrColor, "XYZ or color"),
          new InSocket(this, Socket.Type.VectorOrColor, "XYZ or color"),
        ]),
      );

      this.outs.push(
        new OutSocket(this, Socket.Type.Float, "Ratio", context => {
          const col0 = this.colorSockets[0].inValue(context);
          const col1 = this.colorSockets[1].inValue(context);

          return cm.difference.contrastRatio(col0, col1);
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

    webglGetBaseVariables(): WebglVariables {
      const illuminant0 = this.colorSockets[0].effectiveType() === St.Vector
          ? "illuminant2_E"
          : "{illuminant0}"
      const illuminant1 = this.colorSockets[1].effectiveType() === St.Vector
          ? "illuminant2_E"
          : "{illuminant1}"

      return new WebglVariables(
        `float {0:contrastRatio} = contrastRatio({xyz0}, ${illuminant0}, {xyz1}, ${illuminant1});`,
        new Map([
          [null, {"val": "{0:contrastRatio}"}],
          [this.outs[0], {"val": "{0:contrastRatio}"}],
        ]),
      ).nameVariableSlots(1);
    }
    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      switch (inSocket) {
        case this.colorSockets[0]: 
          if (this.colorSockets[0].effectiveType() === St.ColorCoords) {
            return <WebglSocketValue<T>>{
              "xyz": "xyz0",
              "illuminant": "illuminant0",
            };
          } else {
            return <WebglSocketValue<T>>{
              "val": "xyz0",
            };
          }

        case this.colorSockets[1]: 
          if (this.colorSockets[1].effectiveType() === St.ColorCoords) {
            return <WebglSocketValue<T>>{
              "xyz": "xyz1",
              "illuminant": "illuminant1",
            };
          } else {
            return <WebglSocketValue<T>>{
              "val": "xyz1",
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

    //@ts-ignore

    static readonly overloadGroup = new OverloadGroup(new Map<RandomFloatMode, Overload<number>>([
      [RandomFloatMode.FloatSeed, new Overload(
        "Float seed",
        node => [
          new InSocket(node, St.Bool, "Integer", false),
          new InSocket(node, St.Float, "Seed", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, St.Float, "Min", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, St.Float, "Max", true, {sliderProps: {hasBounds: false}, defaultValue: 1}),
        ],
        (node, ins) => [
          new OutSocket(node, St.Float, "Value", context => {
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
        (ins, outs, context) => new WebglVariables(
          `float {0:float} = random({seed}) * ({max} - {min} + ({useFloor} ? 1. : 0.)) + {min};
  float {1:val} = {useFloor} ? floor({0:float}) : {0:float};`,
          new Map([
            [null, {"val": "{1:val}"}],
            [outs[0], {"val": "{1:val}"}],
          ]),
        ).nameVariableSlots(2),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: RandomFloatNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "useFloor"};
            case ins[1]: return <WebglSocketValue<T>>{"val": "seed"};
            case ins[2]: return <WebglSocketValue<T>>{"val": "min"};
            case ins[3]: return <WebglSocketValue<T>>{"val": "max"};
            default: return null;
          }
        },
      )],
      
      [RandomFloatMode.VectorSeed, new Overload(
        "Vector seed",
        node => [
          new InSocket(node, St.Bool, "Integer", false),
          new InSocket(node, St.Vector, "Seed", true, {sliderProps: [
            {hasBounds: false},
            {hasBounds: false},
            {hasBounds: false},
          ]}),
          new InSocket(node, St.Float, "Min", true, {sliderProps: {hasBounds: false}}),
          new InSocket(node, St.Float, "Max", true, {sliderProps: {hasBounds: false}, defaultValue: 1}),
        ],
        (node, ins) => [
          new OutSocket(node, St.Float, "Value", context => {
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
        (ins, outs, context) => new WebglVariables(
          `float {0:float} = random({seed}) * ({max} - {min} + ({useFloor} ? 1. : 0.)) + {min};
  float {1:val} = {useFloor} ? floor({0:float}) : {0:float};`,
          new Map([
            [null, {"val": "{1:val}"}],
            [outs[0], {"val": "{1:val}"}],
          ]),
        ).nameVariableSlots(2),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: RandomFloatNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "useFloor"};
            case ins[1]: return <WebglSocketValue<T>>{"val": "seed"};
            case ins[2]: return <WebglSocketValue<T>>{"val": "min"};
            case ins[3]: return <WebglSocketValue<T>>{"val": "max"};
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