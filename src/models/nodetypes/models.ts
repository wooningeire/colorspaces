import {Node, Socket, SocketType as St, SocketFlag, NodeEvalContext, Tree, OutputDisplayType} from "../Node";
import { Overload, OverloadManager, OverloadGroup } from "../Overload";
import * as cm from "../colormanagement";

import {Color, Vec2, Vec3, pipe} from "@/util";

export namespace models {
	//TODO code duplication
	export class RgbNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "RGB";
		static readonly DESC = "desc.node.rgb";

		constructor() {
			super();

			this.ins.push(
				new Socket(this, true, Socket.Type.Float, "Red").flag(SocketFlag.Rgb),
				new Socket(this, true, Socket.Type.Float, "Green").flag(SocketFlag.Rgb),
				new Socket(this, true, Socket.Type.Float, "Blue").flag(SocketFlag.Rgb),
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
		static readonly DESC = "desc.node.hsl";

		constructor() {
			super();

			this.ins.push(
				new Socket(this, true, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
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

	enum HsvMethod {
		ToRgb = "to rgb",
		FromRgbVector = "from rgb vector",
		FromRgbColor = "from rgb color",
	}
	export class HsvNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "HSV";
		static readonly DESC = "desc.node.hsv";
        static readonly outputDisplayType = OutputDisplayType.Vec;

		private static readonly HsvMethod = HsvMethod;
		private static readonly overloadGroup = new OverloadGroup(new Map<HsvMethod, Overload<Color | number>>([
			[HsvMethod.ToRgb, new Overload(
				"To RGB",
				node => [
					new Socket(node, true, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
					new Socket(node, true, Socket.Type.Float, "Saturation"),
					new Socket(node, true, Socket.Type.Float, "Value"),
				],
				node => [
					new Socket(node, false, Socket.Type.RgbRaw, "RGB"),
				],
				(ins, outs, context) => cm.hsvToRgb(ins.map(socket => socket.inValue(context)) as Color) as Color,
			)],

			[HsvMethod.FromRgbVector, new Overload(
				"From RGB",
				node => [
					new Socket(node, true, Socket.Type.RgbRawOrColTransformed, "RGB or RGB color"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
					new Socket(node, false, Socket.Type.Float, "Saturation"),
					new Socket(node, false, Socket.Type.Float, "Value"),
				],
				(ins, outs, context) => cm.rgbToHsv(ins[0].inValue(context) as Vec3)[outs.indexOf(context.socket!)],
			)],
		]));

		private readonly overloadManager = new OverloadManager(this, HsvNode.HsvMethod.ToRgb, HsvNode.overloadGroup);

		constructor() {
			super();
            this.overloadManager.setSockets();
		}

		output(context: NodeEvalContext): Color | number {
			return this.overloadManager.evaluate(context);
		}

		onSocketFieldValueChange(socket: Socket, tree: Tree) {
			if (socket !== this.overloadManager.dropdown) return;
			this.overloadManager.handleModeChange(tree);
		}
	}

	export class HwbNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "HWB";
		static readonly DESC = "desc.node.hwb";

		constructor() {
			super();

			this.ins.push(
				new Socket(this, true, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
				new Socket(this, true, Socket.Type.Float, "Whiteness"),
				new Socket(this, true, Socket.Type.Float, "Blackness"),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "RGB"),
			);
		}

		output(context: NodeEvalContext): Color {
			return cm.hwbToRgb(this.ins.map(socket => socket.inValue(context)) as Color) as Color;
		}
	}

	export class CmyNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "CMY";
		static readonly DESC = "desc.node.cmy";

		constructor() {
			super();

			this.ins.push(
				new Socket(this, true, Socket.Type.Float, "Cyan").flag(SocketFlag.Rgb),
				new Socket(this, true, Socket.Type.Float, "Magenta").flag(SocketFlag.Rgb),
				new Socket(this, true, Socket.Type.Float, "Yellow").flag(SocketFlag.Rgb),
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

		constructor() {
			super();

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
		static readonly DESC = "desc.node.vector";

		constructor() {
			super();

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
		static readonly DESC = "desc.node.spectralPowerDistribution";

		distribution: number[] =
			Array(830 - 360 + 1).fill(0)
					.map((_, x) => Math.exp(-(((x - 235) / 90)**2)))
		;

		colorMatchingDataset: "2deg" | "10deg" = "2deg";

		constructor() {
			super();
			
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

	export class WavelengthNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Wavelength";
		static readonly DESC = "desc.node.wavelength";

		private readonly inSocket: Socket<St.Float>;
		private readonly powerSocket: Socket<St.Float>;
		private readonly datasetSocket: Socket<St.Dropdown>;

		constructor() {
			super();

			this.ins.push(
				(this.inSocket = new Socket(this, true, Socket.Type.Float, "Wavelength (nm)", true, {
					sliderProps: {
						min: 360,
						max: 830,
						step: 1,
					},
					defaultValue: 510,
				})),
				(this.powerSocket = new Socket(this, true, Socket.Type.Float, "Relative power", true, {
					sliderProps: {
						hasBounds: false,
					},
					defaultValue: 1,
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
			return [...cm.singleWavelength(this.inSocket.inValue(context), this.datasetSocket.inValue(context) as "2deg" | "10deg")]
					.map(comp => comp * this.powerSocket.inValue(context)) as any as Vec3;
		}
	}

	export class BlackbodyNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Blackbody";
		static readonly DESC = "desc.node.blackbody";

		private readonly inSocket: Socket<St.Float>;
		private readonly datasetSocket: Socket<St.Dropdown>;

		constructor() {
			super();

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

	export class ChromaticityNode extends Node {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Chromaticity";
		static readonly DESC = "desc.node.chromaticity";

		constructor() {
			super();

			this.ins.push(
				new Socket(this, true, Socket.Type.Float, "x", true, {
					defaultValue: cm.illuminantsXy["2deg"]["D65"][0],
				}),
				new Socket(this, true, Socket.Type.Float, "y", true, {
					defaultValue: cm.illuminantsXy["2deg"]["D65"][1],
				}),
			);
		}
	}
}