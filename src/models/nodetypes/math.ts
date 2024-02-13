import { labSliderProps } from "./spaces";
import { Node, Socket, SocketType as St, NodeEvalContext, OutputDisplayType, NodeWithOverloads, OutSocket, InSocket } from "../Node";
import * as cm from "../colormanagement";

import { Color, Vec3, lerp } from "@/util";
import { Overload, OverloadGroup } from "../Overload";

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

    static readonly overloadGroup = new OverloadGroup(new Map<ArithmeticMode, Overload<number>>([
      [ArithmeticMode.Add, new Overload(
        "Add",
        node => [
          new InSocket(node, Socket.Type.Float, "Addend"),
          new InSocket(node, Socket.Type.Float, "Addend"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Float, "Sum"),
        ],
        (ins, outs, context) => ins[0].inValue(context) + ins[1].inValue(context),
      )],
      
      [ArithmeticMode.Multiply, new Overload(
        "Multiply",
        node => [
          new InSocket(node, Socket.Type.Float, "Factor"),
          new InSocket(node, Socket.Type.Float, "Factor"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Float, "Product"),
        ],
        (ins, outs, context) => ins[0].inValue(context) * ins[1].inValue(context),
      )],
      
      [ArithmeticMode.Subtract, new Overload(
        "Subtract",
        node => [
          new InSocket(node, Socket.Type.Float, "Minuend"),
          new InSocket(node, Socket.Type.Float, "Subtrahend"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Float, "Difference"),
        ],
        (ins, outs, context) => ins[0].inValue(context) - ins[1].inValue(context),
      )],
      
      [ArithmeticMode.Divide, new Overload(
        "Divide",
        node => [
          new InSocket(node, Socket.Type.Float, "Dividend"),
          new InSocket(node, Socket.Type.Float, "Divisor"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Float, "Quotient"),
        ],
        (ins, outs, context) => ins[0].inValue(context) / ins[1].inValue(context),
      )],
      
      [ArithmeticMode.Pow, new Overload(
        "Power",
        node => [
          new InSocket(node, Socket.Type.Float, "Base"),
          new InSocket(node, Socket.Type.Float, "Exponent"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Float, "Power"),
        ],
        (ins, outs, context) => ins[0].inValue(context) ** ins[1].inValue(context),
      )],
      
      [ArithmeticMode.Pow, new Overload(
        "Screen",
        node => [
          new InSocket(node, Socket.Type.Float, "Factor"),
          new InSocket(node, Socket.Type.Float, "Factor"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Float, "Product"),
        ],
        (ins, outs, context) => 1 - (1 - ins[0].inValue(context)) * (1 - ins[1].inValue(context)),
      )],
      
      [ArithmeticMode.Lerp, new Overload(
        "Lerp",
        node => [
          new InSocket(node, Socket.Type.Float, "Min"),
          new InSocket(node, Socket.Type.Float, "Max"),
          new InSocket(node, Socket.Type.Float, "Amount"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Float, "Value"),
        ],
        (ins, outs, context) => lerp(ins[0].inValue(context), ins[1].inValue(context), ins[2].inValue(context)),
      )],
      
      [ArithmeticMode.MapRange, new Overload(
        "Map range",
        node => [
          new InSocket(node, Socket.Type.Float, "Source value"),
          new InSocket(node, Socket.Type.Float, "Source min"),
          new InSocket(node, Socket.Type.Float, "Source max"),
          new InSocket(node, Socket.Type.Float, "Target min"),
          new InSocket(node, Socket.Type.Float, "Target max"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Float, "Target value"),
        ],
        (ins, outs, context) => lerp(ins[3].inValue(context), ins[4].inValue(context), ins[0].inValue(context) / (ins[2].inValue(context) - ins[1].inValue(context))),
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

  export class GetComponentsNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Explode";

    static readonly DESC = "desc.node.explode";

    private readonly inSocket: Socket<St.Vector>;

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
      return value[this.outs.indexOf(context.socket!)];
    }

    // output(context: NodeEvalContext): Color {
    // 	return this.ins.map(socket => socket.inValue(context)) as Color;
    // }
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
        (ins: Socket<St.VectorOrColor>[], outs, context) => {
          const col0 = ins[0].inValue(context);
          const col1 = ins[1].inValue(context);

          return cm.difference.deltaE1976(col0, col1);
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
        (ins: Socket<St.VectorOrColor>[], outs, context) => {
          const col0 = ins[0].inValue(context);
          const col1 = ins[1].inValue(context);

          return cm.difference.deltaE2000(col0, col1);
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

    private readonly colorSockets: Socket<St.VectorOrColor>[];

    static readonly outputDisplayType: OutputDisplayType = OutputDisplayType.Float;

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
  }
}