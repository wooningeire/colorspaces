import {Node, Socket, SocketType} from "./Node";
import {Color, Vec2} from "../util";
import * as cm from "./colormanagement";

export namespace images {
	export class GradientNode extends Node {

	}
}

export namespace rgbModels {
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
				new Socket(this, false, Socket.Type.RgbRaw, "RGB data"),
			);
		}

		output(): Color {
			return this.ins.map(socket => socket.inValue) as Color;
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
				new Socket(this, false, Socket.Type.RgbRaw, "RGB data"),
			);
		}

		output(): Color {
			return cm.hslToRgb(this.ins.map(socket => socket.inValue) as Color) as Color;
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
				new Socket(this, false, Socket.Type.RgbRaw, "RGB data"),
			);
		}

		output(): Color {
			return cm.hsvToRgb(this.ins.map(socket => socket.inValue) as Color) as Color;
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
				new Socket(this, false, Socket.Type.RgbRaw, "RGB data"),
			);
		}

		output(): Color {
			return cm.cmyToRgb(this.ins.map(socket => socket.inValue) as Color) as Color;
		}
	}
}

export namespace math {
	export class LerpNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "RGB blend";

		private readonly methodSocket: Socket<SocketType.Dropdown>;
		private readonly facSocket: Socket<SocketType.Float>;
		private readonly colorSockets: Socket<SocketType.RgbRaw>[];

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.methodSocket = new Socket(this, true, Socket.Type.Dropdown, "", false, {
					options: [
						{value: "mix", text: "Mix", selected: true},
						{value: "add", text: "Add"},
						{value: "multiply", text: "Multiply"},
					],
				})),
				(this.facSocket = new Socket(this, true, Socket.Type.Float, "Blend amount")),
				...(this.colorSockets = [
					new Socket(this, true, Socket.Type.RgbRaw, "RGB"),
					new Socket(this, true, Socket.Type.RgbRaw, "RGB"),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "RGB"),
			);
		}

		output(): Color {
			const fac = this.facSocket.inValue;

			const col0 = this.colorSockets[0].inValue;
			const col1 = this.colorSockets[1].inValue;

			switch (this.methodSocket.inValue) {
				case "mix":
					return col0.map((_, i) => col0[i] * (1 - fac) + col1[i] * fac) as Color;

				case "add":
					return col0.map((_, i) => col0[i] + col1[i] * fac) as Color;

				case "multiply":
					return col0.map((_, i) => col0[i] * ((1 - fac) + col1[i] * fac)) as Color;
					
				default:
					throw new TypeError("Unknown blend mode");
			}

		}
	}
}

export namespace spaces {
	export class LinearNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Linear sRGB";

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.RgbRaw, "RGB"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(): Color {
			return cm.linearToSrgb(this.ins[0].inValue as Color);
		}
	}

	export class SrgbNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "sRGB";

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.RgbRaw, "RGB"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(): Color {
			return this.ins[0].inValue as Color;
		}
	}

	export class XyzNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "XYZ";

		private readonly primariesSockets: Socket[];

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Unknown, "White point", false),
				...(this.primariesSockets = [
					new Socket(this, true, Socket.Type.Float, "X"),
					new Socket(this, true, Socket.Type.Float, "Y"),
					new Socket(this, true, Socket.Type.Float, "Z"),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(): Color {
			return cm.linearToSrgb(cm.xyz2degToLinear(this.primariesSockets.map(socket => socket.inValue) as Color));
		}
	}

	export class XyyNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "xyY";

		private readonly primariesSockets: Socket[];

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Unknown, "White point", false),
				...(this.primariesSockets = [
					new Socket(this, true, Socket.Type.Float, "x (chromaticity 1)"),
					new Socket(this, true, Socket.Type.Float, "y (chromaticity 2)"),
					new Socket(this, true, Socket.Type.Float, "Y (luminance)"),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(): Color {
			return cm.linearToSrgb(cm.xyz2degToLinear(cm.xyyToXyz(this.primariesSockets.map(socket => socket.inValue) as Color)));
		}
	}

	export class LabNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "L*a*b*";

		private readonly primariesSockets: Socket[];

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Unknown, "White point", false),
				...(this.primariesSockets = [
					new Socket(this, true, Socket.Type.Float, "L*"),
					new Socket(this, true, Socket.Type.Float, "a*"),
					new Socket(this, true, Socket.Type.Float, "b*"),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		output(): Color {
			
			console.log(cm.linearToSrgb(
				cm.xyz2degToLinear(
					cm.labToXyz(
						this.primariesSockets.map(socket => socket.inValue) as Color,
						cm.illuminantsXyz["2deg"]["D65"],
					),
				),
			));

			return cm.linearToSrgb(
				cm.xyz2degToLinear(
					cm.labToXyz(
						this.primariesSockets.map(socket => socket.inValue) as Color,
						cm.illuminantsXyz["2deg"]["D65"],
					),
				),
			);
		}
	}
}

export namespace externals {
	export class DeviceTransformNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Device transform";
		
		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.ColTransformed, "Color"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Unknown, "Color data"),
			);
		}

		output(): Color[] {
			return this.ins.filter(socket => socket.links[0])
					.map(socket => socket.links[0].srcNode.output());
		}

		onSocketLink(socket: Socket) {
			if (!socket.isInput) return;

			this.ins.push(
				new Socket(this, true, Socket.Type.ColTransformed, "Color"),
			);
		}

		onSocketUnlink(socket: Socket): void {
			if (!socket.isInput) return;

			this.ins.splice(this.ins.indexOf(socket), 1);
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
		}
	}
}