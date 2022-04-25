import {Node, Socket} from "./Node";
import {Vector} from "../util";

export namespace spaces {
	export class LinearNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Linear";
		
		red: number = 0;
		green: number = 0;
		blue: number = 0;

		constructor() {
			super(SrgbNode.TYPE, SrgbNode.LABEL);

			this.outs.push(
				new Socket(this, false, "Color"),
			);
		}
	}

	export class SrgbNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "sRGB";
		
		red: number = 0;
		green: number = 0;
		blue: number = 0;

		constructor(pos?: Vector) {
			super(SrgbNode.TYPE, SrgbNode.LABEL, pos);

			this.outs.push(
				new Socket(this, false, "Color"),
			);
		}
	}
}

export namespace externals {
	export class DeviceTransformNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Device transform";
		
		constructor(pos?: Vector) {
			super(DeviceTransformNode.TYPE, DeviceTransformNode.LABEL, pos);

			this.ins.push(
				new Socket(this, true, "Color data"),
			);

			this.outs.push(
				new Socket(this, false, "Screen image"),
			);
		}
	}

	export class DevicePostprocessingNode extends Node {}

	export class VisionNode extends Node {}
}