import {Node, Socket, SocketType as St, NodeEvalContext} from "../Node";
import * as cm from "../colormanagement";

import {Vec2} from "@/util";

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

	export class Rec709Node extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Rec. 709";

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

		output(context: NodeEvalContext): cm.Rec709 {
			return cm.Rec709.from(this.inSocket.inValue(context));
		}
	}
}