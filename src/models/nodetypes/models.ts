import {Node, Socket, SocketType as St, NodeEvalContext} from "../Node";
import * as cm from "../colormanagement";

import {Color, Vec2, Vec3, pipe} from "@/util";

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

		distribution: number[] = Array(830 - 360 + 1).fill(0)
				.map((_, x) => Math.exp(-(((x - 235) / 90)**2)));

		colorMatchingDataset: "2deg" | "10deg" = "2deg";

		constructor(pos?: Vec2) {
			super(pos);
			
			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "XYZ"),
			);
			this.width = 503;
		}

		private cachedOutput: Vec3 | null = null;

		output(context: NodeEvalContext): Vec3 {
			return this.cachedOutput
					?? (this.cachedOutput = [...cm.spectralPowerDistribution(this.distribution, this.colorMatchingDataset)] as any as Vec3);
		}

		flushCache() {
			this.cachedOutput = null;
		}
	}

	export class BlackbodyNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Blackbody";

		private readonly inSocket: Socket<St.Float>;
		private readonly datasetSocket: Socket<St.Dropdown>;

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.inSocket = new Socket(this, true, Socket.Type.Float, "Temperature (K)", true, {
					sliderProps: {
						hasBounds: false,
						unboundedChangePerPixel: 10,
					},
					defaultValue: 1750,
				})),
				(this.datasetSocket = new Socket(this, true, Socket.Type.Dropdown, "Dataset", false, {
					defaultValue: "2deg",
					options: [
						{value: "2deg", text: "CIE 2° observer (1931)"},
						{value: "10deg", text: "CIE 10° observer (1964)"},
					],
				})),
			);
			
			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "XYZ"),
			);

			this.width = 180;
		}

		output(context: NodeEvalContext): Vec3 {
			return [...cm.blackbody(this.inSocket.inValue(context), this.datasetSocket.inValue(context) as "2deg" | "10deg")] as any as Vec3;
		}
	}
}