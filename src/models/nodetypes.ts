import {Field, Node, Socket} from "./Node";
import {Color, Vec2} from "../util";
import * as cm from "./colormanagement";

export namespace rgbModels {
	
}

export namespace spaces {

	export class LinearNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Linear sRGB";
		
		red: number = 0;
		green: number = 0;
		blue: number = 0;

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				new Socket(this, true, Socket.Type.Rgb, "RGB"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		srgbOutput(): Color {
			return cm.linearToSrgb(this.ins[0].inValue as Color);
		}
	}

	export class SrgbNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "sRGB";

		constructor(pos?: Vec2) {
			super(pos);

			this.fields.push(
				new Field("Red"),
				new Field("Green"),
				new Field("Blue"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.ColTransformed, "Color"),
			);
		}

		srgbOutput(): Color {
			return this.fields.map(field => field.value) as Color;
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
				new Socket(this, true, Socket.Type.ColTransformed, "Color data"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Unknown, "Screen image"),
			);
		}
	}

	export class DevicePostprocessingNode extends Node {}

	export class VisionNode extends Node {}
}