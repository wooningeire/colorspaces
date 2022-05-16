import {Node, Socket} from "./Node";
import {Color, Vec2} from "../util";
import * as cm from "./colormanagement";

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
				new Socket(this, true, Socket.Type.Unknown, "Standard illuminant", false),
				...(this.primariesSockets = [
					new Socket(this, true, Socket.Type.Float, "X (chromaticity 1)"),
					new Socket(this, true, Socket.Type.Float, "Y (luminance)"),
					new Socket(this, true, Socket.Type.Float, "Z (chromaticity 2)"),
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
}

export namespace externals {
	export class DeviceTransformNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Device transform";

		displayColor: Color = [1, 1, 1]; // temp
		
		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.ColTransformed, "Color data"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Unknown, "Color data"),
			);
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