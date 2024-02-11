import {getIlluminant, labSliderProps, whitePointSocketOptions} from "./spaces";
import {Tree, Node, Socket, SocketType as St, NodeEvalContext, OutputDisplayType, NodeDisplay} from "../Node";
import * as cm from "../colormanagement";

import {Color, lerp} from "@/util";

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

	export class ArithmeticNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Arithmetic";

		private readonly methodSocket: Socket<St.Dropdown>;
		private readonly valueSockets: Socket<St.Float>[];

		constructor() {
			super();

			this.ins.push(
				(this.methodSocket = new Socket(this, true, Socket.Type.Dropdown, "", false, {
					options: [
						{value: "add", text: "Add"},
						{value: "multiply", text: "Multiply"},
						{value: "subtract", text: "Subtract"},
						{value: "divide", text: "Divide"},
						{value: "pow", text: "Power"},
						{value: "lerp", text: "Lerp"},
						{value: "map range", text: "Map range"},
					],
					defaultValue: "multiply",
				})),
				...(this.valueSockets = [
					new Socket(this, true, Socket.Type.Float, "Value", true, {
						sliderProps: {
							hasBounds: false,
						},
					}),
					new Socket(this, true, Socket.Type.Float, "Value", true, {
						sliderProps: {
							hasBounds: false,
						},
					}),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Float, "Value"),
			);
		}

		onSocketFieldValueChange(socket: Socket, tree: Tree) {
			if (socket !== this.methodSocket) return;

			const deleteSocketsUntilLength = (targetLength: number) => {
				while (this.valueSockets.length > targetLength) {
					this.ins.pop();
					const oldSocket = this.valueSockets.pop();
					oldSocket?.links.forEach(link => tree.unlink(link));
				}
			};

			const createUnboundedSockets = (labels: string[]) =>
					labels.map(label => new Socket(this, true, Socket.Type.Float, label, true, {
						sliderProps: {
							hasBounds: false,
						},
					}));

			switch (this.methodSocket.inValue()) {
				case "lerp": {
					deleteSocketsUntilLength(2);

					this.valueSockets[0].label = this.valueSockets[1].label = "Value";

					const newSocket = new Socket(this, true, Socket.Type.Float, "Amount");
					this.ins.push(newSocket);
					this.valueSockets.push(newSocket);
					break;
				}

				case "map range": {
					deleteSocketsUntilLength(1);

					this.valueSockets[0].label = "Value";
					const newSockets = createUnboundedSockets(["Source min", "Source max", "Target min", "Target max"]);
					this.ins.push(...newSockets);
					this.valueSockets.push(...newSockets);
					break;
				}

				case "pow": {
					deleteSocketsUntilLength(2);
					this.valueSockets[0].label = "Base";
					this.valueSockets[1].label = "Exponent";
					break;
				}

				default:
					deleteSocketsUntilLength(2);
					this.valueSockets[0].label = this.valueSockets[1].label = "Value";
					break;
			}
		}

		output(context: NodeEvalContext): number {
			const n0 = this.valueSockets[0]?.inValue(context);
			const n1 = this.valueSockets[1]?.inValue(context);
			const n2 = this.valueSockets[2]?.inValue(context);
			const n3 = this.valueSockets[3]?.inValue(context);
			const n4 = this.valueSockets[4]?.inValue(context);

			// and make output the same type as the inputs

			switch (this.methodSocket.inValue(context)) {
				case "add": return n0 + n1;
				case "subtract": return n0 - n1;
				case "multiply": return n0 * n1;
				case "divide": return n0 / n1;
				case "pow": return n0**n1;
				case "lerp": return lerp(n0, n1, n2);
				case "map range": return lerp(n3, n4, n0 / (n2 - n1));
					
				default:
					throw new TypeError("Unknown blend mode");
			}
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

	export class DeltaE1976Node extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Color difference (ΔE* 1976)";

		private readonly colorSockets: Socket<St.RgbRawOrColTransformed>[];

		static readonly outputDisplayType: OutputDisplayType = OutputDisplayType.Float;

		constructor() {
			super();

			this.ins.push(
				...(this.colorSockets = [
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "L*a*b* or color", true, {
						sliderProps: labSliderProps,
					}),
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "L*a*b* or color", true, {
						sliderProps: labSliderProps,
					}),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Float, "Difference"),
			);
		}

		output(context: NodeEvalContext): number {
			const col0 = this.colorSockets[0].inValue(context);
			const col1 = this.colorSockets[1].inValue(context);

			return cm.difference.deltaE1976(col0, col1);
		}
		
		display(context: NodeEvalContext) {
			return {
				labels: [],
				values: [this.output(context)],
				flags: [],
			};
		}
	}

	export class DeltaE2000Node extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Color difference (ΔE* 2000)";

		private readonly colorSockets: Socket<St.RgbRawOrColTransformed>[];

		static readonly outputDisplayType: OutputDisplayType = OutputDisplayType.Float;

		constructor() {
			super();

			this.ins.push(
				...(this.colorSockets = [
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "Sample L*a*b* or color", true, {
						sliderProps: labSliderProps,
					}),
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "Target L*a*b* or color", true, {
						sliderProps: labSliderProps,
					}),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Float, "Difference"),
			);
		}

		output(context: NodeEvalContext): number {
			const col0 = this.colorSockets[0].inValue(context);
			const col1 = this.colorSockets[1].inValue(context);

			return cm.difference.deltaE2000(col0, col1);
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