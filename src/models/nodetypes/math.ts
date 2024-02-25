import seedrandom from "seedrandom";

import { labSliderProps } from "./spaces";
import { Node, Socket, SocketType as St, NodeEvalContext, OutputDisplayType, NodeWithOverloads, OutSocket, InSocket, WebglSocketValue } from "../Node";
import * as cm from "../colormanagement";

import { Color, Vec3, lerp } from "@/util";
import { Overload, OverloadGroup } from "../Overload";
import { WebglVariables } from "@/webgl-compute/WebglVariables";

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
    static readonly LABEL = "Vector arithmetic";
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
          new InSocket(node, Socket.Type.Float, "Blend amount"),
          new InSocket(node, Socket.Type.Vector, "Start"),
          new InSocket(node, Socket.Type.Vector, "End"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Vector, "Vector"),
        ],
        (ins, outs, context) => {
          const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
          return col0.map((_, i) => lerp(col0[i], col1[i], fac)) as Vec3;
        },
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "mix({val0}, {val1}, {fac})"}],
            [outs[0], {"val": "mix({val0}, {val1}, {fac})"}],
          ]),
        ),
        this.threeValueMapping,
      )],

      [VectorArithmeticMode.Add, new Overload(
        "Add",
        node => [
          new InSocket(node, Socket.Type.Float, "Blend amount"),
          new InSocket(node, Socket.Type.Vector, "Addend"),
          new InSocket(node, Socket.Type.Vector, "Addend"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Vector, "Sum"),
        ],
        (ins, outs, context) => {
          const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
          return col0.map((_, i) => col0[i] + col1[i] * fac) as Vec3;
        },
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "{val0} + {val1} * {fac}"}],
            [outs[0], {"val": "{val0} + {val1} * {fac}"}],
          ]),
        ),
        this.threeValueMapping,
      )],

      [VectorArithmeticMode.Multiply, new Overload(
        "Componentwise multiply",
        node => [
          new InSocket(node, Socket.Type.Float, "Blend amount"),
          new InSocket(node, Socket.Type.Vector, "Factor"),
          new InSocket(node, Socket.Type.Vector, "Factor"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Vector, "Product"),
        ],
        (ins, outs, context) => {
          const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
          return col0.map((_, i) => col0[i] * ((1 - fac) + col1[i] * fac)) as Vec3;
        },
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "{val0} * ((1. - {fac}) + {val1} * {fac})"}],
            [outs[0], {"val": "{val0} * ((1. - {fac}) + {val1} * {fac})"}],
          ]),
        ),
        this.threeValueMapping,
      )],

      [VectorArithmeticMode.Subtract, new Overload(
        "Subtract",
        node => [
          new InSocket(node, Socket.Type.Float, "Blend amount"),
          new InSocket(node, Socket.Type.Vector, "Minuend"),
          new InSocket(node, Socket.Type.Vector, "Subtrahend"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Vector, "Difference"),
        ],
        (ins, outs, context) => {
          const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
          return col0.map((_, i) => col0[i] - col1[i] * fac) as Vec3;
        },
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "{val0} - {val1} * {fac}"}],
            [outs[0], {"val": "{val0} - {val1} * {fac}"}],
          ]),
        ),
        this.threeValueMapping,
      )],

      [VectorArithmeticMode.Divide, new Overload(
        "Componentwise divide",
        node => [
          new InSocket(node, Socket.Type.Float, "Blend amount"),
          new InSocket(node, Socket.Type.Vector, "Dividend"),
          new InSocket(node, Socket.Type.Vector, "Divisor"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Vector, "Quotient"),
        ],
        (ins, outs, context) => {
          const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
          return col0.map((_, i) => col0[i] / ((1 - fac) + col1[i] * fac)) as Vec3;
        },
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "{val0} / ((1. - {fac}) + {val1} * {fac})"}],
            [outs[0], {"val": "{val0} / ((1. - {fac}) + {val1} * {fac})"}],
          ]),
        ),
        this.threeValueMapping,
      )],

      [VectorArithmeticMode.Screen, new Overload(
        "Screen",
        node => [
          new InSocket(node, Socket.Type.Float, "Blend amount"),
          new InSocket(node, Socket.Type.Vector, "Factor"),
          new InSocket(node, Socket.Type.Vector, "Factor"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Vector, "Product"),
        ],
        (ins, outs, context) => {
          const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
          return col0.map((_, i) => 1 - (1 - col0[i]) * (1 - col1[i] * fac)) as Vec3;
        },
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, { "val": "1. - (1. - {val0}) * (1. - {val1} * {fac})"}],
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
        node => [
          new OutSocket(node, Socket.Type.Float, "Distance"),
        ],
        (ins, outs, context) => {
          const [col0, col1] = ins.map(socket => socket.inValue(context)) as [Vec3, Vec3];
          return Math.hypot(...col0.map((_, i) => col0[i] - col1[i]));
        },
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "length({val0} - {val1})"}],
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
        node => [
          new OutSocket(node, Socket.Type.Vector, "Vector"),
        ],
        (ins, outs, context) => {
          const [col, scalar] = ins.map(socket => socket.inValue(context)) as [Vec3, number];
          return col.map((_, i) => col[i] * scalar) as Vec3;
        },
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "{vector} * {scalar}"}],
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

    constructor() {
      super(VectorArithmeticMode.Lerp);
      this.width = 200;
    }

    display(context: NodeEvalContext) {
      const output = this.output(context);
      return {
        labels: [],
        values: typeof output === "number"
            ? [output]
            : output as Vec3,
        flags: [],
      };
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
    static readonly LABEL = "Arithmetic";
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
        node => [
          new OutSocket(node, Socket.Type.Float, "Sum"),
        ],
        (ins, outs, context, node) => ins[0].inValue(context) + ins[1].inValue(context),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "{val0} + {val1}"}],
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
        node => [
          new OutSocket(node, Socket.Type.Float, "Product"),
        ],
        (ins, outs, context) => ins[0].inValue(context) * ins[1].inValue(context),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "{val0} * {val1}"}],
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
        node => [
          new OutSocket(node, Socket.Type.Float, "Difference"),
        ],
        (ins, outs, context) => ins[0].inValue(context) - ins[1].inValue(context),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "{val0} - {val1}"}],
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
        node => [
          new OutSocket(node, Socket.Type.Float, "Quotient"),
        ],
        (ins, outs, context) => ins[0].inValue(context) / ins[1].inValue(context),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "{val0} / {val1}"}],
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
        node => [
          new OutSocket(node, Socket.Type.Float, "Power"),
        ],
        (ins, outs, context) => ins[0].inValue(context) ** ins[1].inValue(context),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "pow({val0}, {val1})"}],
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
        node => [
          new OutSocket(node, Socket.Type.Float, "Product"),
        ],
        (ins, outs, context) => 1 - (1 - ins[0].inValue(context)) * (1 - ins[1].inValue(context)),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "1. - (1. - {val0}) * (1. - {val1})"}],
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
        node => [
          new OutSocket(node, Socket.Type.Float, "Value"),
        ],
        (ins, outs, context) => lerp(ins[0].inValue(context), ins[1].inValue(context), ins[2].inValue(context)),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "mix({min}, {max}, {fac})"}],
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
        node => [
          new OutSocket(node, Socket.Type.Float, "Target value"),
        ],
        (ins, outs, context) => lerp(ins[3].inValue(context), ins[4].inValue(context), ins[0].inValue(context) / (ins[2].inValue(context) - ins[1].inValue(context))),
        (ins, outs, context, node) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "mix({targetMin}, {targetMax}, {source} / ({sourceMax} - {sourceMin}))"}],
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

    display(context: NodeEvalContext) {
      return {
        labels: [],
        values: [this.output(context)],
        flags: [],
      };
    }
  }

  export class VectorNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Vector";
    static readonly DESC = "desc.node.vector";

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
        new OutSocket(this, Socket.Type.Vector, "Vector"),
      );
    }

    output(context: NodeEvalContext): Color {
      return this.ins.map(socket => socket.inValue(context)) as Color;
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
    static readonly LABEL = "Split vector";

    static readonly DESC = "desc.node.splitVector";

    private readonly inSocket: InSocket<St.Vector>;

    constructor() {
      super();

      this.ins.push(
        (this.inSocket = new InSocket(this, Socket.Type.Vector, "Vector")),
      );

      this.outs.push(
        new OutSocket(this, Socket.Type.Float, "1"),
        new OutSocket(this, Socket.Type.Float, "2"),
        new OutSocket(this, Socket.Type.Float, "3"),
      );
    }

    output(context: NodeEvalContext): number {
      const value = this.inSocket.inValue(context);
      return value[this.outs.indexOf(context.socket! as OutSocket)];
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
    static readonly LABEL = "Color difference";
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
        node => [
          new OutSocket(node, Socket.Type.Float, "Difference"),
        ],
        (ins: InSocket<St.VectorOrColor>[], outs, context) => {
          const col0 = ins[0].inValue(context);
          const col1 = ins[1].inValue(context);

          return cm.difference.deltaE1976(col0, col1);
        },
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
              [undefined, {"val": "{0:difference}"}],
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
        node => [
          new OutSocket(node, Socket.Type.Float, "Difference"),
        ],
        (ins: InSocket<St.VectorOrColor>[], outs, context) => {
          const col0 = ins[0].inValue(context);
          const col1 = ins[1].inValue(context);

          return cm.difference.deltaE2000(col0, col1);
        },
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
              [undefined, {"val": "{0:difference}"}],
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
    
    display(context: NodeEvalContext) {
      return {
        labels: [],
        values: [this.output(context)],
        flags: [],
      };
    }
  }

  export class ContrastRatioNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Contrast ratio";
    static readonly DESC = "desc.node.contrastRatio";
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
        new OutSocket(this, Socket.Type.Float, "Ratio"),
      );
    }

    output(context: NodeEvalContext): number {
      const col0 = this.colorSockets[0].inValue(context);
      const col1 = this.colorSockets[1].inValue(context);

      return cm.difference.contrastRatio(col0, col1);
    }
    
    display(context: NodeEvalContext) {
      return {
        labels: [],
        values: [this.output(context)],
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
          [undefined, {"val": "{0:contrastRatio}"}],
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

  export class RandomFloatNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Random float";
    static readonly DESC = "desc.node.randomFloat";
    static readonly outputDisplayType = OutputDisplayType.Float;

    constructor() {
      super();
      
      this.ins.push(
        new InSocket(this, St.Bool, "Integer", false),
        new InSocket(this, St.Float, "Seed", true, {sliderProps: {hasBounds: false}}),
        new InSocket(this, St.Float, "Min", true, {sliderProps: {hasBounds: false}}),
        new InSocket(this, St.Float, "Max", true, {sliderProps: {hasBounds: false}, defaultValue: 1}),
      );

      this.outs.push(
        new OutSocket(this, St.Float, "Value"),
      );
    }

    output(context: NodeEvalContext): number {
      const useFloor = this.ins[0].inValue(context)
      const min = this.ins[2].inValue(context) as number;
      const max = this.ins[3].inValue(context) as number;

      const rng = seedrandom(this.ins[1].inValue(context).toString())

      const float = rng() * (max - min + (useFloor ? 1 : 0)) + min;
      return useFloor ? Math.floor(float) : float;
    }
    
    display(context: NodeEvalContext) {
      return {
        labels: [],
        values: [this.output(context)],
        flags: [],
      };
    }
  }
}