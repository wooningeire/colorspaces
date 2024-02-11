import {getIlluminant, labSliderProps, whitePointSocketOptions} from "./spaces";
import {Tree, Node, Socket, SocketType as St, NodeEvalContext, OutputDisplayType, NodeDisplay, NodeWithOverloads} from "../Node";
import * as cm from "../colormanagement";

import {Color, Vec3, lerp} from "@/util";
import { Overload, OverloadGroup, OverloadManager } from "../Overload";

export namespace math {
	enum VectorArithmeticMode {
		Lerp = "lerp",
		Add = "add",
		Multiply = "multiply",
		Subtract = "subtract",
		Divide = "divide",
		Screen = "screen",
		Scale = "scale",
	}
	export class VectorArithmeticNode extends NodeWithOverloads<VectorArithmeticMode> {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Vector arithmetic";
		static readonly outputDisplayType = OutputDisplayType.Vec;

		static readonly overloadGroup = new OverloadGroup(new Map<VectorArithmeticMode, Overload<Vec3>>([
			[VectorArithmeticMode.Lerp, new Overload(
				"Lerp",
				node => [
					new Socket(node, true, Socket.Type.Float, "Blend amount"),
					new Socket(node, true, Socket.Type.Vector, "Start"),
					new Socket(node, true, Socket.Type.Vector, "End"),
				],
				node => [
					new Socket(node, false, Socket.Type.Vector, "Vector"),
				],
				(ins, outs, context) => {
					const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
					return col0.map((_, i) => lerp(col0[i], col1[i], fac)) as Vec3;
				},
			)],

			[VectorArithmeticMode.Add, new Overload(
				"Add",
				node => [
					new Socket(node, true, Socket.Type.Float, "Blend amount"),
					new Socket(node, true, Socket.Type.Vector, "Addend"),
					new Socket(node, true, Socket.Type.Vector, "Addend"),
				],
				node => [
					new Socket(node, false, Socket.Type.Vector, "Sum"),
				],
				(ins, outs, context) => {
					const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
					return col0.map((_, i) => col0[i] + col1[i] * fac) as Vec3;
				},
			)],

			[VectorArithmeticMode.Multiply, new Overload(
				"Componentwise multiply",
				node => [
					new Socket(node, true, Socket.Type.Float, "Blend amount"),
					new Socket(node, true, Socket.Type.Vector, "Factor"),
					new Socket(node, true, Socket.Type.Vector, "Factor"),
				],
				node => [
					new Socket(node, false, Socket.Type.Vector, "Product"),
				],
				(ins, outs, context) => {
					const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
					return col0.map((_, i) => col0[i] * ((1 - fac) + col1[i] * fac)) as Vec3;
				},
			)],

			[VectorArithmeticMode.Subtract, new Overload(
				"Subtract",
				node => [
					new Socket(node, true, Socket.Type.Float, "Blend amount"),
					new Socket(node, true, Socket.Type.Vector, "Minuend"),
					new Socket(node, true, Socket.Type.Vector, "Subtrahend"),
				],
				node => [
					new Socket(node, false, Socket.Type.Vector, "Difference"),
				],
				(ins, outs, context) => {
					const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
					return col0.map((_, i) => col0[i] - col1[i] * fac) as Vec3;
				},
			)],

			[VectorArithmeticMode.Divide, new Overload(
				"Componentwise divide",
				node => [
					new Socket(node, true, Socket.Type.Float, "Blend amount"),
					new Socket(node, true, Socket.Type.Vector, "Dividend"),
					new Socket(node, true, Socket.Type.Vector, "Divisor"),
				],
				node => [
					new Socket(node, false, Socket.Type.Vector, "Quotient"),
				],
				(ins, outs, context) => {
					const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
					return col0.map((_, i) => col0[i] / ((1 - fac) + col1[i] * fac)) as Vec3;
				},
			)],

			[VectorArithmeticMode.Screen, new Overload(
				"Screen",
				node => [
					new Socket(node, true, Socket.Type.Float, "Blend amount"),
					new Socket(node, true, Socket.Type.Vector, "Factor"),
					new Socket(node, true, Socket.Type.Vector, "Factor"),
				],
				node => [
					new Socket(node, false, Socket.Type.Vector, "Product"),
				],
				(ins, outs, context) => {
					const [fac, col0, col1] = ins.map(socket => socket.inValue(context)) as [number, Vec3, Vec3];
					return col0.map((_, i) => 1 - (1 - col0[i]) * (1 - col1[i] * fac)) as Vec3;
				},
			)],

			[VectorArithmeticMode.Scale, new Overload(
				"Scalar multiply",
				node => [
					new Socket(node, true, Socket.Type.Vector, "Vector"),
					new Socket(node, true, Socket.Type.Float, "Scalar"),
				],
				node => [
					new Socket(node, false, Socket.Type.Vector, "Vector"),
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
			return {
				labels: [],
				values: this.output(context),
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
					new Socket(node, true, Socket.Type.Float, "Addend"),
					new Socket(node, true, Socket.Type.Float, "Addend"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Sum"),
				],
				(ins, outs, context) => ins[0].inValue(context) + ins[1].inValue(context),
			)],
			
			[ArithmeticMode.Multiply, new Overload(
				"Multiply",
				node => [
					new Socket(node, true, Socket.Type.Float, "Factor"),
					new Socket(node, true, Socket.Type.Float, "Factor"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Product"),
				],
				(ins, outs, context) => ins[0].inValue(context) * ins[1].inValue(context),
			)],
			
			[ArithmeticMode.Subtract, new Overload(
				"Subtract",
				node => [
					new Socket(node, true, Socket.Type.Float, "Minuend"),
					new Socket(node, true, Socket.Type.Float, "Subtrahend"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Difference"),
				],
				(ins, outs, context) => ins[0].inValue(context) - ins[1].inValue(context),
			)],
			
			[ArithmeticMode.Divide, new Overload(
				"Divide",
				node => [
					new Socket(node, true, Socket.Type.Float, "Dividend"),
					new Socket(node, true, Socket.Type.Float, "Divisor"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Quotient"),
				],
				(ins, outs, context) => ins[0].inValue(context) / ins[1].inValue(context),
			)],
			
			[ArithmeticMode.Pow, new Overload(
				"Power",
				node => [
					new Socket(node, true, Socket.Type.Float, "Base"),
					new Socket(node, true, Socket.Type.Float, "Exponent"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Power"),
				],
				(ins, outs, context) => ins[0].inValue(context) ** ins[1].inValue(context),
			)],
			
			[ArithmeticMode.Pow, new Overload(
				"Screen",
				node => [
					new Socket(node, true, Socket.Type.Float, "Factor"),
					new Socket(node, true, Socket.Type.Float, "Factor"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Product"),
				],
				(ins, outs, context) => 1 - (1 - ins[0].inValue(context)) * (1 - ins[1].inValue(context)),
			)],
			
			[ArithmeticMode.Lerp, new Overload(
				"Lerp",
				node => [
					new Socket(node, true, Socket.Type.Float, "Min"),
					new Socket(node, true, Socket.Type.Float, "Max"),
					new Socket(node, true, Socket.Type.Float, "Amount"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Value"),
				],
				(ins, outs, context) => lerp(ins[0].inValue(context), ins[1].inValue(context), ins[2].inValue(context)),
			)],
			
			[ArithmeticMode.MapRange, new Overload(
				"Map range",
				node => [
					new Socket(node, true, Socket.Type.Float, "Source value"),
					new Socket(node, true, Socket.Type.Float, "Source min"),
					new Socket(node, true, Socket.Type.Float, "Source max"),
					new Socket(node, true, Socket.Type.Float, "Target min"),
					new Socket(node, true, Socket.Type.Float, "Target max"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Target value"),
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
				(this.inSocket = new Socket(this, true, Socket.Type.Vector, "Vector")),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Float, "1"),
				new Socket(this, false, Socket.Type.Float, "2"),
				new Socket(this, false, Socket.Type.Float, "3"),
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
					new Socket(node, true, St.VectorOrColor, "L*a*b* or color", true, {
						sliderProps: labSliderProps,
					}),
					new Socket(node, true, St.VectorOrColor, "L*a*b* or color", true, {
						sliderProps: labSliderProps,
					}),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Difference"),
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
					new Socket(node, true, St.VectorOrColor, "Sample L*a*b* or color", true, {
						sliderProps: labSliderProps,
					}),
					new Socket(node, true, St.VectorOrColor, "Target L*a*b* or color", true, {
						sliderProps: labSliderProps,
					}),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Difference"),
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
					new Socket(this, true, Socket.Type.VectorOrColor, "XYZ or color"),
					new Socket(this, true, Socket.Type.VectorOrColor, "XYZ or color"),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Float, "Ratio"),
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

	export class StandardIlluminantNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Standard illuminant";
		static readonly DESC = "desc.node.standardIlluminant";

		private readonly whitePointSocket: Socket<St.Dropdown>;

		private readonly outXyzSocket: Socket<St.Vector>;
		private readonly outXyySocket: Socket<St.Vector>;

		constructor() {
			super();

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
			);

			this.outs.push(
				(this.outXyzSocket = new Socket(this, false, Socket.Type.Vector, "XYZ")),
				(this.outXyySocket = new Socket(this, false, Socket.Type.Vector, "xyY")),
			);
		}

		output(context: NodeEvalContext): number[] {
			const illuminant = getIlluminant(this.whitePointSocket, context);

			return context.socket === this.outXyzSocket
					? [...cm.Xyz.from(illuminant)]
					: [...cm.Xyy.from(illuminant)];
		}
	}
}