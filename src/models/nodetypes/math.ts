import {getIlluminant, labSliderProps, whitePointSocketOptions} from "./spaces";
import {Tree, Node, Socket, SocketType as St, NodeEvalContext, OutputDisplayType, NodeDisplay} from "../Node";
import * as cm from "../colormanagement";

import {Color, lerp} from "@/util";
import { Overload, OverloadGroup, OverloadManager } from "../Overload";

export namespace math {
	export class LerpNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Vector blend";

		private readonly methodSocket: Socket<St.Dropdown>;
		private readonly facSocket: Socket<St.Float>;
		private readonly colorSockets: Socket<St.RgbRawOrColTransformed>[];

		constructor() {
			super();

			this.ins.push(
				(this.methodSocket = new Socket(this, true, Socket.Type.Dropdown, "", false, {
					options: [
						{value: "mix", text: "Mix"},
						{value: "add", text: "Add"},
						{value: "multiply", text: "Multiply"},
					],
					defaultValue: "mix",
				})),
				(this.facSocket = new Socket(this, true, Socket.Type.Float, "Blend amount")),
				...(this.colorSockets = [
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "Vector or color"),
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "Vector or color"),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "Vector"),
			);
		}

		output(context: NodeEvalContext): Color {
			const fac = this.facSocket.inValue(context);

			// TODO check that inputs are of same type
			const col0 = this.colorSockets[0].inValue(context);
			const col1 = this.colorSockets[1].inValue(context);

			// and make output the same type as the inputs

			switch (this.methodSocket.inValue(context)) {
				case "mix":
					return col0.map((_, i) => lerp(col0[i], col1[i], fac)) as Color;

				case "add":
					return col0.map((_, i) => col0[i] + col1[i] * fac) as Color;

				case "multiply":
					return col0.map((_, i) => col0[i] * ((1 - fac) + col1[i] * fac)) as Color;
					
				default:
					throw new TypeError("Unknown blend mode");
			}

		}
	}


	enum ArithmeticMode {
		Add = "add",
		Multiply = "multiply",
		Subtract = "subtract",
		Divide = "divide",
		Pow = "pow",
		Lerp = "lerp",
		MapRange = "mapRange",
	}
	export class ArithmeticNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Arithmetic";

		static readonly outputDisplayType = OutputDisplayType.Float;

		private static readonly overloadGroup = new OverloadGroup(new Map<ArithmeticMode, Overload<Color | number>>([
			[ArithmeticMode.Add, new Overload(
				"Add",
				node => [
					new Socket(node, true, Socket.Type.Float, "Addend", true, {sliderProps: {hasBounds: false}}),
					new Socket(node, true, Socket.Type.Float, "Addend", true, {sliderProps: {hasBounds: false}}),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Sum"),
				],
				(ins: Socket<St.Float>[], outs, context) => ins[0].inValue(context) + ins[1].inValue(context),
			)],
			
			[ArithmeticMode.Multiply, new Overload(
				"Multiply",
				node => [
					new Socket(node, true, Socket.Type.Float, "Factor", true, {sliderProps: {hasBounds: false}}),
					new Socket(node, true, Socket.Type.Float, "Factor", true, {sliderProps: {hasBounds: false}}),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Product"),
				],
				(ins: Socket<St.Float>[], outs, context) => ins[0].inValue(context) * ins[1].inValue(context),
			)],
			
			[ArithmeticMode.Subtract, new Overload(
				"Subtract",
				node => [
					new Socket(node, true, Socket.Type.Float, "Minuend", true, {sliderProps: {hasBounds: false}}),
					new Socket(node, true, Socket.Type.Float, "Subtrahend", true, {sliderProps: {hasBounds: false}}),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Difference"),
				],
				(ins: Socket<St.Float>[], outs, context) => ins[0].inValue(context) - ins[1].inValue(context),
			)],
			
			[ArithmeticMode.Divide, new Overload(
				"Divide",
				node => [
					new Socket(node, true, Socket.Type.Float, "Dividend", true, {sliderProps: {hasBounds: false}}),
					new Socket(node, true, Socket.Type.Float, "Divisor", true, {sliderProps: {hasBounds: false}}),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Quotient"),
				],
				(ins: Socket<St.Float>[], outs, context) => ins[0].inValue(context) / ins[1].inValue(context),
			)],
			
			[ArithmeticMode.Pow, new Overload(
				"Power",
				node => [
					new Socket(node, true, Socket.Type.Float, "Base", true, {sliderProps: {hasBounds: false}}),
					new Socket(node, true, Socket.Type.Float, "Exponent", true, {sliderProps: {hasBounds: false}}),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Power"),
				],
				(ins: Socket<St.Float>[], outs, context) => ins[0].inValue(context) ** ins[1].inValue(context),
			)],
			
			[ArithmeticMode.Lerp, new Overload(
				"Lerp",
				node => [
					new Socket(node, true, Socket.Type.Float, "Min", true, {sliderProps: {hasBounds: false}}),
					new Socket(node, true, Socket.Type.Float, "Max", true, {sliderProps: {hasBounds: false}}),
					new Socket(node, true, Socket.Type.Float, "Amount"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Value"),
				],
				(ins: Socket<St.Float>[], outs, context) => lerp(ins[0].inValue(context), ins[1].inValue(context), ins[2].inValue(context)),
			)],
			
			[ArithmeticMode.MapRange, new Overload(
				"Map range",
				node => [
					new Socket(node, true, Socket.Type.Float, "Source value", true, {sliderProps: {hasBounds: false}}),
					new Socket(node, true, Socket.Type.Float, "Source min", true, {sliderProps: {hasBounds: false}}),
					new Socket(node, true, Socket.Type.Float, "Source max", true, {sliderProps: {hasBounds: false}}),
					new Socket(node, true, Socket.Type.Float, "Target min", true, {sliderProps: {hasBounds: false}}),
					new Socket(node, true, Socket.Type.Float, "Target max", true, {sliderProps: {hasBounds: false}}),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Target value"),
				],
				(ins: Socket<St.Float>[], outs, context) => lerp(ins[3].inValue(context), ins[4].inValue(context), ins[0].inValue(context) / (ins[2].inValue(context) - ins[1].inValue(context))),
			)],
		]));

		private readonly overloadManager = new OverloadManager(this, ArithmeticMode.Add, ArithmeticNode.overloadGroup);

		constructor() {
			super();
			this.overloadManager.setSockets();
		}

		onSocketFieldValueChange(socket: Socket, tree: Tree) {
			if (socket !== this.overloadManager.dropdown) return;
			this.overloadManager.handleModeChange(tree);
		}

		output(context: NodeEvalContext): number {
			return this.overloadManager.evaluate(context);
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

		private readonly inSocket: Socket<St.RgbRawOrColTransformed>;

		constructor() {
			super();

			this.ins.push(
				(this.inSocket = new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "Color or vector")),
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
	export class ColorDifferenceNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Color difference";
		static readonly outputDisplayType: OutputDisplayType = OutputDisplayType.Float;

		private static readonly overloadGroup = new OverloadGroup(new Map<ColorDifferenceMode, Overload<Color | number>>([
			[ColorDifferenceMode.DeltaE1976, new Overload(
				"ΔE* 1976",
				node => [
					new Socket(node, true, St.RgbRawOrColTransformed, "L*a*b* or color", true, {
						sliderProps: labSliderProps,
					}),
					new Socket(node, true, St.RgbRawOrColTransformed, "L*a*b* or color", true, {
						sliderProps: labSliderProps,
					}),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Difference"),
				],
				(ins: Socket<St.RgbRawOrColTransformed>[], outs, context) => {
					const col0 = ins[0].inValue(context);
					const col1 = ins[1].inValue(context);

					return cm.difference.deltaE1976(col0, col1);
				},
			)],
			
			[ColorDifferenceMode.DeltaE2000, new Overload(
				"ΔE* 2000",
				node => [
					new Socket(node, true, St.RgbRawOrColTransformed, "Sample L*a*b* or color", true, {
						sliderProps: labSliderProps,
					}),
					new Socket(node, true, St.RgbRawOrColTransformed, "Target L*a*b* or color", true, {
						sliderProps: labSliderProps,
					}),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Difference"),
				],
				(ins: Socket<St.RgbRawOrColTransformed>[], outs, context) => {
					const col0 = ins[0].inValue(context);
					const col1 = ins[1].inValue(context);

					return cm.difference.deltaE2000(col0, col1);
				},
			)],
		]));

		private readonly overloadManager = new OverloadManager(this, ColorDifferenceMode.DeltaE2000, ColorDifferenceNode.overloadGroup);

		constructor() {
			super();
			this.overloadManager.setSockets();
		}

		onSocketFieldValueChange(socket: Socket, tree: Tree) {
			if (socket !== this.overloadManager.dropdown) return;
			this.overloadManager.handleModeChange(tree);
		}

		output(context: NodeEvalContext): number {
			return this.overloadManager.evaluate(context);
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

		private readonly colorSockets: Socket<St.RgbRawOrColTransformed>[];

		static readonly outputDisplayType: OutputDisplayType = OutputDisplayType.Float;

		constructor() {
			super();

			this.ins.push(
				...(this.colorSockets = [
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "XYZ or color"),
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "XYZ or color"),
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

		private readonly outXyzSocket: Socket<St.RgbRaw>;
		private readonly outXyySocket: Socket<St.RgbRaw>;

		constructor() {
			super();

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
			);

			this.outs.push(
				(this.outXyzSocket = new Socket(this, false, Socket.Type.RgbRaw, "XYZ")),
				(this.outXyySocket = new Socket(this, false, Socket.Type.RgbRaw, "xyY")),
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