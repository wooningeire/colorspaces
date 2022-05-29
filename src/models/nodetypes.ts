import {Tree, Node, Socket, SocketType as St, Link, AxisNode, NodeEvalContext} from "./Node";
import * as cm from "./colormanagement";

import {Color, Vec2, Vec3, pipe, lerp} from "@/util";

export namespace images {
	export class GradientNode extends Node implements AxisNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Gradient";

		private readonly axisSocket: Socket<St.Dropdown>;
		private readonly boundsSockets: Socket<St.Float>[];

		get axes() {
			return [this.whichDimension];
		}

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.axisSocket = new Socket(this, true, Socket.Type.Dropdown, "Axis", false, {
					options: [
						{text: "X", value: "0"},
						{text: "Y", value: "1"},
					],
					defaultValue: "0",
				})),
				...(this.boundsSockets = [
					new Socket(this, true, Socket.Type.Float, "From", true, {
						sliderProps: {
							hasBounds: false,
						},
					}),
					new Socket(this, true, Socket.Type.Float, "To", true, {
						defaultValue: 1,
						sliderProps: {
							hasBounds: false,
						},
					}),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Float, "Values"),
			);
		}

		get whichDimension() {
			return Number(this.axisSocket.inValue());
		}

		output(context: NodeEvalContext): number {
			const fac = context.coords?.[this.whichDimension] ?? 0;
			const value0 = this.boundsSockets[0].inValue(context);
			const value1 = this.boundsSockets[1].inValue(context);
			return lerp(value0, value1, fac);
		}
	}

	export class ImageFileNode extends Node implements AxisNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Image file";

		private readonly inSocket: Socket<St.Image>;

		get axes() {
			return [0, 1];
		}

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.inSocket = new Socket(this, true, Socket.Type.Image, "File", false)),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "RGB"),
			);
		}

		output(context: NodeEvalContext) {
			const imageData = this.inSocket.inValue(context);
			if (imageData) {
				const x = Math.round((context.coords?.[0] ?? 0) * imageData.width);
				const y = Math.round((context.coords?.[1] ?? 0) * imageData.height);

				const index = (x + y * imageData.width) * 4;
				const colorData = [...imageData.data.slice(index, index + 3)]
						.map(comp => comp / 255);

				if (colorData.length === 0) return [0, 0, 0];

				return colorData;
			}
			return [0, 0, 0];
		}
	}
}

export namespace models {
	//TODO code duplication
	export class RgbNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "RGB";

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Float, "Red"),
				new Socket(this, true, Socket.Type.Float, "Green"),
				new Socket(this, true, Socket.Type.Float, "Blue"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "RGB"),
			);
		}

		output(context: NodeEvalContext): Color {
			return this.ins.map(socket => socket.inValue(context)) as Color;
		}

		pipeOutput() {
			return pipe();
		}
	}

	export class HslNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "HSL";

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Float, "Hue"),
				new Socket(this, true, Socket.Type.Float, "Saturation"),
				new Socket(this, true, Socket.Type.Float, "Lightness"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "RGB"),
			);
		}

		output(context: NodeEvalContext): Color {
			return cm.hslToRgb(this.ins.map(socket => socket.inValue(context)) as Color) as Color;
		}
	}

	export class HsvNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "HSV";

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Float, "Hue"),
				new Socket(this, true, Socket.Type.Float, "Saturation"),
				new Socket(this, true, Socket.Type.Float, "Value"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "RGB"),
			);
		}

		output(context: NodeEvalContext): Color {
			return cm.hsvToRgb(this.ins.map(socket => socket.inValue(context)) as Color) as Color;
		}
	}

	export class CmyNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "CMY";

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Float, "Cyan"),
				new Socket(this, true, Socket.Type.Float, "Magenta"),
				new Socket(this, true, Socket.Type.Float, "Yellow"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "RGB"),
			);
		}

		output(context: NodeEvalContext): Color {
			return cm.cmyToRgb(this.ins.map(socket => socket.inValue(context)) as Color) as Color;
		}
	}

	/* export class XyzModelNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "XYZ (model)";

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Float, "X"),
				new Socket(this, true, Socket.Type.Float, "Y"),
				new Socket(this, true, Socket.Type.Float, "Z"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "XYZ"),
			);
		}

		output(context: NodeEvalContext): Color {
			return this.ins.map(socket => socket.inValue(context)) as Color;
		}
	} */

	export class VectorNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Vector";

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Float, "", true, {
					sliderProps: {
						hasBounds: false,
					},
				}),
				new Socket(this, true, Socket.Type.Float, "", true, {
					sliderProps: {
						hasBounds: false,
					},
				}),
				new Socket(this, true, Socket.Type.Float, "", true, {
					sliderProps: {
						hasBounds: false,
					},
				}),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "Vector"),
			);
		}

		output(context: NodeEvalContext): Color {
			return this.ins.map(socket => socket.inValue(context)) as Color;
		}
	}

	export class SpectralPowerDistributionNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Spectral power distribution";

		distribution: number[] = Array(830 - 360 + 1).fill(0);

		constructor(pos?: Vec2) {
			super(pos);
			
			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "XYZ"),
			);
			this.width = 500;
		}

		output(context: NodeEvalContext): Vec3 {
			return cm.spectralPowerDistribution(this.distribution) as any as Vec3;
		}
	}
}

export namespace math {
	export class LerpNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "RGB blend";

		private readonly methodSocket: Socket<St.Dropdown>;
		private readonly facSocket: Socket<St.Float>;
		private readonly colorSockets: Socket<St.RgbRawOrColTransformed>[];

		constructor(pos?: Vec2) {
			super(pos);

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
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "RGB or color"),
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "RGB or color"),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "RGB"),
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

	export class GetComponentsNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Get components";

		private readonly inSocket: Socket<St.RgbRawOrColTransformed>;

		constructor(pos?: Vec2) {
			super(pos);

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

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				...(this.colorSockets = [
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "L*a*b* or color"),
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "L*a*b* or color"),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Float, "Difference"),
			);
		}

		output(context: NodeEvalContext): number {
			// TODO check that inputs are of same type
			const col0 = this.colorSockets[0].inValue(context);
			const col1 = this.colorSockets[1].inValue(context);

			return cm.difference.deltaE1976(col0, col1);
		}
	}
}

export namespace spaces {
	export class LinearNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Linear sRGB";

		readonly inSocket: Socket<St.RgbRawOrColTransformed>;

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.inSocket = new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "RGB or color")),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(context: NodeEvalContext) {
			return cm.LinearSrgb.from(this.inSocket.inValue(context));
		}
	}

	export class SrgbNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "sRGB";

		readonly inSocket: Socket<St.RgbRawOrColTransformed>;

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.inSocket = new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "RGB or color")),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(context: NodeEvalContext): cm.Srgb {
			return cm.Srgb.from(this.inSocket.inValue(context));
		}
	}

	const whitePointSocketOptions = {
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
	};
	const getIlluminant = (socket: Socket<St.Dropdown>, context: NodeEvalContext) => {
		const illuminantId = socket.inValue(context);
		if (illuminantId !== "custom") {
			const [standard, illuminantName] = illuminantId.split("/"); 
			return cm.illuminantsXy[standard][illuminantName];
		} else {
			throw new Error("not implemented");
		}
	};

	export class XyzNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "XYZ";

		private readonly whitePointSocket: Socket<St.Dropdown>;
		private readonly colorSocket: Socket<St.RgbRawOrColTransformed>;

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
				(this.colorSocket = new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "XYZ or color")),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(context: NodeEvalContext) {
			const illuminant = getIlluminant(this.whitePointSocket, context);

			return cm.Xyz.from(this.colorSocket.inValue(context), illuminant);
		}
	}

	const d65 = cm.illuminantsXy["2deg"]["D65"];

	export class XyyNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "xyY";

		private readonly whitePointSocket: Socket<St.Dropdown>;
		private readonly colorSocket: Socket<St.RgbRawOrColTransformed>;
		// private readonly primariesSockets: Socket<SocketType.Float>[];

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
				(this.colorSocket = new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "xyY or color", true, {defaultValue: [d65[0], d65[1], 1]})),
				// ...(this.primariesSockets = [
				// 	new Socket(this, true, Socket.Type.Float, "x (chromaticity 1)", true, {defaultValue: d65[0]}),
				// 	new Socket(this, true, Socket.Type.Float, "y (chromaticity 2)", true, {defaultValue: d65[1]}),
				// 	new Socket(this, true, Socket.Type.Float, "Y (luminance)", true, {defaultValue: 1}),
				// ]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(context: NodeEvalContext): cm.Xyy {
			const illuminant = getIlluminant(this.whitePointSocket, context);
			return cm.Xyy.from(this.colorSocket.inValue(context), illuminant);
		}
	}

	export class LabNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "L*a*b*";

		private readonly whitePointSocket: Socket<St.Dropdown>;
		private readonly colorSocket: Socket<St.RgbRawOrColTransformed>;

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
				(this.colorSocket = new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "L*a*b* or color", true, {
					defaultValue: [50, 0, 0],
					sliderProps: [
						{
							max: 100,
						},
						{
							hasBounds: false,
							unboundedChangePerPixel: 1,
						},
						{
							hasBounds: false,
							unboundedChangePerPixel: 1,
						},
					],
				})),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(context: NodeEvalContext): cm.Lab {
			const illuminant = getIlluminant(this.whitePointSocket, context);
			return cm.Lab.from(this.colorSocket.inValue(context), illuminant);
		}
	}

	export class LchAbNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "L*C*h(ab)";

		private readonly whitePointSocket: Socket<St.Dropdown>;
		private readonly colorSocket: Socket<St.RgbRawOrColTransformed>;

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
				(this.colorSocket = new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "L*C*h or color", true, {
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
				})),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(context: NodeEvalContext): cm.Lab {
			const illuminant = getIlluminant(this.whitePointSocket, context);
			return cm.LchAb.from(this.colorSocket.inValue(context), illuminant);
		}
	}

	export class LuvNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "L*u*v*";

		private readonly whitePointSocket: Socket<St.Dropdown>;
		private readonly colorSocket: Socket<St.RgbRawOrColTransformed>;

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
				(this.colorSocket = new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "L*u*v* or color", true, {
					defaultValue: [50, 0, 0],
					sliderProps: [
						{
							max: 100,
						},
						{
							hasBounds: false,
							unboundedChangePerPixel: 1,
						},
						{
							hasBounds: false,
							unboundedChangePerPixel: 1,
						},
					],
				})),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(context: NodeEvalContext): cm.Luv {
			const illuminant = getIlluminant(this.whitePointSocket, context);
			return cm.Luv.from(this.colorSocket.inValue(context), illuminant);
		}
	}

	export class LchUvNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "L*C*h(uv)";

		private readonly whitePointSocket: Socket<St.Dropdown>;
		private readonly colorSocket: Socket<St.RgbRawOrColTransformed>;

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.whitePointSocket = new Socket(this, true, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions)),
				(this.colorSocket = new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "L*C*h or color", true, {
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
				})),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(context: NodeEvalContext): cm.LchUv {
			const illuminant = getIlluminant(this.whitePointSocket, context);
			return cm.LchUv.from(this.colorSocket.inValue(context), illuminant);
		}
	}

	export class LinearAdobeRgbNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Linear Adobe RGB 1998";

		readonly inSocket: Socket<St.RgbRawOrColTransformed>;

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.inSocket = new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "RGB or color")),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(context: NodeEvalContext) {
			return cm.LinearAdobeRgb.from(this.inSocket.inValue(context));
		}
	}

	export class AdobeRgbNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Adobe RGB 1998";

		readonly inSocket: Socket<St.RgbRawOrColTransformed>;

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.inSocket = new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "RGB or color")),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(context: NodeEvalContext): cm.AdobeRgb {
			return cm.AdobeRgb.from(this.inSocket.inValue(context));
		}
	}
}

export namespace externals {
	export class DeviceTransformNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Display buffer";

		readonly colorSockets: Socket<St.RgbRawOrColTransformed>[];
		
		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Dropdown, "Device color space", false, {
					options: [
						{value: "srgb", text: "sRGB"},
					],
					defaultValue: "srgb",
				}),
				...(this.colorSockets = [
					new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "Color"),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Unknown, "Color data"),
			);

			this.canMove = false;
		}

		output(context: NodeEvalContext): cm.Srgb {
			const color = (context.socket! as Socket<St.RgbRawOrColTransformed>).inValue(context);

			return color && cm.Srgb.from(color);
			// return this.colorSockets.filter(socket => socket.hasLinks)
			// 		.map(socket => cm.Srgb.from(socket.inValueFn(context)));
		}

		pipeOutput() {
			const node = this.colorSockets[0].node as models.RgbNode;

			return pipe(node.pipeOutput(), cm.Srgb.from);
		}

		onSocketLink(socket: Socket, link: Link, tree: Tree) {
			super.onSocketLink(socket, link, tree);

			if (!socket.isInput) return;

			const newSocket = new Socket(this, true, Socket.Type.RgbRawOrColTransformed, "Color");

			this.ins.push(newSocket);
			this.colorSockets.push(newSocket);
		}

		onSocketUnlink(socket: Socket, link: Link, tree: Tree): void {
			super.onSocketUnlink(socket, link, tree);

			if (!socket.isInput) return;

			this.ins.splice(this.ins.indexOf(socket), 1);
			this.colorSockets.splice(this.colorSockets.indexOf(socket), 1);
		}
	}

	export class DevicePostprocessingNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Device postprocessing";
		
		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Unknown, "Color data"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Unknown, "Screen image"),
			);

			this.canMove = false;
			this.canEditLinks = false;
		}
	}

	export class EnvironmentNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Environmental conditions";
		
		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Unknown, "Radiation"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Unknown, "Radiation"),
			);

			this.canMove = false;
			this.canEditLinks = false;
		}
	}

	export class VisionNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Human vision";
		
		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Unknown, "Light"),
			);

			this.canMove = false;
			this.canEditLinks = false;
		}
	}
}

export namespace organization {
	export class RerouteNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Reroute";
		
		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Any, ""),
			);

			this.width = 30;
		}

		output(context: NodeEvalContext) {
			return this.ins[0].inValue(context);
		}

		onSocketLink(socket: Socket, link: Link, tree: Tree) {
			super.onSocketLink(socket, link, tree);

			if (socket.isOutput) return;
			const type = link.src.type;
			this.ins[0].type = type;

			this.outs.push(new Socket(this, false, type, ""));
		}

		onSocketUnlink(socket: Socket, link: Link, tree: Tree) {
			super.onSocketUnlink(socket, link, tree);

			if (socket.isOutput) return;

			this.outs[0].links.forEach(link => tree.unlink(link));
			this.outs.pop();
			this.ins[0].type = St.Any;
		}
	}
}