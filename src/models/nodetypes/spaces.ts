import { Vec3 } from "@/util";
import {Node, Socket, SocketType as St, SocketFlag, NodeEvalContext, OutputDisplayType, NodeWithOverloads} from "../Node";
import { Overload, OverloadGroup } from "../Overload";
import * as cm from "../colormanagement";
import {StringKey} from "@/strings";


abstract class SpaceNode extends Node { 
	static readonly outputDisplayType: OutputDisplayType = OutputDisplayType.Color;
}

export const labSliderProps = [
	{
		max: 100,
	},
	{
		hasBounds: false,
		unboundedChangePerPixel: 0.25,
	},
	{
		hasBounds: false,
		unboundedChangePerPixel: 0.25,
	},
];

export const whitePointSocketOptions = {
	options: [
		{value: "2deg/A", text: "CIE 2° / A"},
		{value: "2deg/B", text: "CIE 2° / B"},
		{value: "2deg/C", text: "CIE 2° / C"},
		{value: "2deg/D50", text: "CIE 2° / D50"},
		{value: "2deg/D55", text: "CIE 2° / D55"},
		{value: "2deg/D60", text: "CIE 2° / D60"},
		{value: "2deg/D65", text: "CIE 2° / D65"},
		{value: "2deg/D75", text: "CIE 2° / D75"},
		{value: "2deg/E", text: "CIE 2° / E"},
		{value: "10deg/A", text: "CIE 10° / A"},
		{value: "10deg/B", text: "CIE 10° / B"},
		{value: "10deg/C", text: "CIE 10° / C"},
		{value: "10deg/D50", text: "CIE 10° / D50"},
		{value: "10deg/D55", text: "CIE 10° / D55"},
		{value: "10deg/D60", text: "CIE 10° / D60"},
		{value: "10deg/D65", text: "CIE 10° / D65"},
		{value: "10deg/D75", text: "CIE 10° / D75"},
		{value: "10deg/E", text: "CIE 10° / E"},
	],
	defaultValue: "2deg/D65",
	socketDesc: "desc.socket.illuminant" as StringKey,
};
export const getIlluminant = (socket: Socket<St.Dropdown>, context: NodeEvalContext) => {
	const illuminantId = socket.inValue(context);
	if (illuminantId !== "custom") {
		const [standard, illuminantName] = illuminantId.split("/"); 
		return cm.illuminantsXy[standard][illuminantName];
	} else {
		throw new Error("not implemented");
	}
};

export namespace spaces {
	enum SpaceMode {
		FromVec = "from vector",
		FromValues = "from values",
	}

	abstract class RgbSpaceNode extends NodeWithOverloads<SpaceMode> {
		static readonly outputDisplayType = OutputDisplayType.Color;

		static readonly overloadGroup = new OverloadGroup(new Map<SpaceMode, Overload<cm.Col>>([
			[SpaceMode.FromVec, new Overload(
				"From vector",
				node => [
					new Socket(node, true, Socket.Type.VectorOrColor, "RGB or color").flag(SocketFlag.Rgb),
				],
				node => [
					new Socket(node, false, Socket.Type.ColorCoords, "Color"),
					new Socket(node, false, Socket.Type.Float, "R"),
					new Socket(node, false, Socket.Type.Float, "G"),
					new Socket(node, false, Socket.Type.Float, "B"),
				],
				(ins, outs, context, node) => {
					const rgb = (node as RgbSpaceNode).RgbClass.from(ins[0].inValue(context));
					switch (context.socket) {
						default:
						case outs[0]: return rgb;
						case outs[1]: return rgb[0];
						case outs[2]: return rgb[1];
						case outs[3]: return rgb[2];
					}
				},
			)],

			[SpaceMode.FromValues, new Overload(
				"From values",
				node => [
					new Socket(node, true, Socket.Type.Float, "R").flag(SocketFlag.Rgb),
					new Socket(node, true, Socket.Type.Float, "G").flag(SocketFlag.Rgb),
					new Socket(node, true, Socket.Type.Float, "B").flag(SocketFlag.Rgb),
				],
				node => [
					new Socket(node, false, Socket.Type.ColorCoords, "Color"),
				],
				(ins, outs, context, node) => {
					return (node as RgbSpaceNode).RgbClass.from(ins.map(socket => socket.inValue(context)) as Vec3);
				},
			)],
		]));

		constructor() {
			super(SpaceMode.FromVec);
		}

		get displayLabels() {
			return ["R", "G", "B"];
		}

		get displayFlags() {
			return [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb];
		}

		/** The RGB class to use for conversions */
		get RgbClass(): typeof cm.Col {
			throw new TypeError("abstract method / not implemented");
		}
	}

	export class LinearNode extends RgbSpaceNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Linear sRGB";
		static readonly DESC = "desc.node.linearSrgb";

		get RgbClass() {
			return cm.LinearSrgb;
		}
	}

	export class SrgbNode extends RgbSpaceNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "sRGB";
		static readonly DESC = "desc.node.srgb";

		get RgbClass() {
			return cm.Srgb;
		}
	}

	export class XyzNode extends SpaceNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "XYZ";

		static readonly DESC = "desc.node.xyz";

		private readonly whitePointSocket: Socket<St.Dropdown>;
		private readonly colorSocket: Socket<St.VectorOrColor>;

		constructor() {
			super();

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
				(this.colorSocket = new Socket(this, true, Socket.Type.VectorOrColor, "XYZ or color", true, {
					fieldText: [
						"desc.field.xyz.x",
						"desc.field.xyz.y",
						"desc.field.xyz.z",
					],
				})),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColorCoords, "Color"),
			);
		}

		output(context: NodeEvalContext) {
			const illuminant = getIlluminant(this.whitePointSocket, context);

			return cm.Xyz.from(this.colorSocket.inValue(context), illuminant);
		}

		get displayLabels() {
			return ["X", "Y", "Z"];
		}
	}

	const d65 = cm.illuminantsXy["2deg"]["D65"];

	export class XyyNode extends SpaceNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "xyY";

		static readonly DESC = "desc.node.xyy";

		private readonly whitePointSocket: Socket<St.Dropdown>;
		private readonly colorSocket: Socket<St.VectorOrColor>;
		// private readonly primariesSockets: Socket<SocketType.Float>[];

		constructor() {
			super();

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
				(this.colorSocket = new Socket(this, true, Socket.Type.VectorOrColor, "xyY or color", true, {
					defaultValue: [d65[0], d65[1], 1],
					fieldText: [
						"desc.field.xyy.x",
						"desc.field.xyy.y",
						"desc.field.xyy.lum",
					],
				})),
				// ...(this.primariesSockets = [
				// 	new Socket(this, true, Socket.Type.Float, "x (chromaticity 1)", true, {defaultValue: d65[0]}),
				// 	new Socket(this, true, Socket.Type.Float, "y (chromaticity 2)", true, {defaultValue: d65[1]}),
				// 	new Socket(this, true, Socket.Type.Float, "Y (luminance)", true, {defaultValue: 1}),
				// ]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColorCoords, "Color"),
			);
		}

		output(context: NodeEvalContext) {
			const illuminant = getIlluminant(this.whitePointSocket, context);
			return cm.Xyy.from(this.colorSocket.inValue(context), illuminant);
		}

		get displayLabels() {
			return ["x", "y", "Y"];
		}
	}

	export class LabNode extends SpaceNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "L\\*a\\*b\\*";
		static readonly DESC = "desc.node.lab";

		private readonly whitePointSocket: Socket<St.Dropdown>;
		private readonly colorSocket: Socket<St.VectorOrColor>;

		constructor() {
			super();

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
				(this.colorSocket = new Socket(this, true, Socket.Type.VectorOrColor, "L*a*b* or color", true, {
					defaultValue: [50, 0, 0],
					sliderProps: labSliderProps,
				})),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColorCoords, "Color"),
			);
		}

		output(context: NodeEvalContext) {
			const illuminant = getIlluminant(this.whitePointSocket, context);
			return cm.Lab.from(this.colorSocket.inValue(context), illuminant);
		}

		get displayLabels() {
			return ["L*", "a*", "b*"];
		}
	}

	export class LchAbNode extends SpaceNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "L\\*C\\*h<sub>ab</sub>";
		static readonly DESC = "desc.node.lchab";

		private readonly whitePointSocket: Socket<St.Dropdown>;
		private readonly colorSocket: Socket<St.VectorOrColor>;

		constructor() {
			super();

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
				(this.colorSocket = new Socket(this, true, Socket.Type.VectorOrColor, "L*C*h or color", true, {
					defaultValue: [50, 0, 0],
					sliderProps: [
						{
							max: 100,
						},
						{
							hasBounds: false,
							unboundedChangePerPixel: 2,
						},
						{},
					],
					fieldText: [
						"desc.field.lchab.l",
						"desc.field.lchab.c",
						"desc.field.lchab.h",
					],
				})),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColorCoords, "Color"),
			);
		}

		output(context: NodeEvalContext) {
			const illuminant = getIlluminant(this.whitePointSocket, context);
			return cm.LchAb.from(this.colorSocket.inValue(context), illuminant);
		}

		get displayLabels() {
			return ["L*", "C*", "h"];
		}
	}

	export class LuvNode extends SpaceNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "L\\*u\\*v\\*";
		static readonly DESC = "desc.node.luv";

		private readonly whitePointSocket: Socket<St.Dropdown>;
		private readonly colorSocket: Socket<St.VectorOrColor>;

		constructor() {
			super();

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
				(this.colorSocket = new Socket(this, true, Socket.Type.VectorOrColor, "L*u*v* or color", true, {
					defaultValue: [50, 0, 0],
					sliderProps: labSliderProps,
				})),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColorCoords, "Color"),
			);
		}

		output(context: NodeEvalContext) {
			const illuminant = getIlluminant(this.whitePointSocket, context);
			return cm.Luv.from(this.colorSocket.inValue(context), illuminant);
		}

		get displayLabels() {
			return ["L*", "u*", "v*"];
		}
	}
	export class LchUvNode extends NodeWithOverloads<SpaceMode> {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "L\\*C\\*h<sub>uv</sub>";
		static readonly DESC = "desc.node.lchuv";
		static readonly outputDisplayType = OutputDisplayType.Color;

		static readonly overloadGroup = new OverloadGroup(new Map<SpaceMode, Overload<cm.Col>>([
			[SpaceMode.FromVec, new Overload(
				"From vector",
				node => [
					new Socket(node, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions),
					new Socket(node, true, Socket.Type.VectorOrColor, "L*C*h or color", true, {
						defaultValue: [50, 0, 0],
						sliderProps: [
							{
								max: 100,
							},
							{
								hasBounds: false,
								unboundedChangePerPixel: 2,
							},
							{},
						],
						fieldText: [
							"desc.field.lchab.l",
							"desc.field.lchab.c",
							"desc.field.lchab.h",
						],
					}),
				],
				node => [
					new Socket(node, false, Socket.Type.ColorCoords, "Color"),
					new Socket(node, false, Socket.Type.Float, "L*"),
					new Socket(node, false, Socket.Type.Float, "C*"),
					new Socket(node, false, Socket.Type.Float, "h"),
				],
				(ins, outs, context, node) => {
					// const lchuv = node.memoize(() => {
					// 	const illuminant = getIlluminant(ins[0], context);
					// 	return cm.LchUv.from(ins[1].inValue(context), illuminant);
					// });
					const illuminant = getIlluminant(ins[0], context);
					const lchuv = cm.LchUv.from(ins[1].inValue(context), illuminant);
					switch (context.socket) {
						default:
						case outs[0]: return lchuv;
						case outs[1]: return lchuv[0];
						case outs[2]: return lchuv[1];
						case outs[3]: return lchuv[2];
					}
				},
			)],

			[SpaceMode.FromValues, new Overload(
				"From values",
				node => [
					new Socket(node, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions),
					new Socket(node, true, Socket.Type.Float, "L*", true, {
						defaultValue: 50,
						sliderProps: {
							max: 100
						},
						fieldText: "desc.field.lchab.l",
					}),
					new Socket(node, true, Socket.Type.Float, "C*", true, {
						defaultValue: 0,
						sliderProps: {
							hasBounds: false,
							unboundedChangePerPixel: 2,
						},
						fieldText: "desc.field.lchab.c",
					}),
					new Socket(node, true, Socket.Type.Float, "h", true, {
						defaultValue: 0,
						fieldText: "desc.field.lchab.h",
					}),
				],
				node => [
					new Socket(node, false, Socket.Type.ColorCoords, "Color"),
				],
				(ins, outs, context) => {
					const illuminant = getIlluminant(ins[0], context);
					return cm.LchUv.from([
						ins[1].inValue(context),
						ins[2].inValue(context),
						ins[3].inValue(context),
					], illuminant);
				},
			)],
		]));

		constructor() {
			super(SpaceMode.FromVec);
		}

		get displayLabels() {
			return ["L*", "C*", "h"];
		}
	}

	export class LinearAdobeRgbNode extends RgbSpaceNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Linear Adobe RGB 1998";

		get RgbClass() {
			return cm.LinearAdobeRgb;
		}
	}

	export class AdobeRgbNode extends RgbSpaceNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Adobe RGB 1998";

		get RgbClass() {
			return cm.AdobeRgb;
		}
	}

	export class Rec709Node extends RgbSpaceNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Rec. 709";
		static readonly DESC = "desc.node.rec709";

		get RgbClass() {
			return cm.Rec709;
		}
	}
}