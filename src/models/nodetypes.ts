import {Node, Socket} from "./Node";
import {Vec2} from "../util";

export namespace spaces {
	export class LinearNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Linear";
		
		red: number = 0;
		green: number = 0;
		blue: number = 0;

		constructor() {
			super();

			this.outs.push(
				new Socket(this, false, Socket.Type.COL_TRANSFORMED, "Color"),
			);
		}
	}

	export class SrgbNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "sRGB";
		
		red: number = 0;
		green: number = 0;
		blue: number = 0;

		constructor(pos?: Vec2) {
			super(pos);

			this.outs.push(
				new Socket(this, false, Socket.Type.COL_TRANSFORMED, "Color"),
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
				new Socket(this, true, Socket.Type.COL_TRANSFORMED, "Color data"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.UNKNOWN, "Screen image"),
			);
		}
	}

	export class DevicePostprocessingNode extends Node {}

	export class VisionNode extends Node {}
}