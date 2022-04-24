import {Node, Socket} from "./Node";

export namespace colorModelNodes {
	export class RgbNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "RGB";
		
		red: number = 0;
		green: number = 0;
		blue: number = 0;

		constructor() {
			super(RgbNode.TYPE, RgbNode.LABEL);

			this.outs.push(
				new Socket(this, false, "Raw color"),
			);
		}
	}
}

namespace externalDeviceNodes {
	export class DeviceTransformNode extends Node {

	}
}