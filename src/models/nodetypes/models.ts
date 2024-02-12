import {Node, Socket, SocketType as St, SocketFlag, NodeEvalContext, Tree, OutputDisplayType, NodeWithOverloads} from "../Node";
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
				new Socket(this, false, Socket.Type.Vector, "RGB"),
			);
		}

		output(context: NodeEvalContext): Color {
			return this.ins.map(socket => socket.inValue(context)) as Color;
		}

		pipeOutput() {
			return pipe();
		}
	}

	enum RgbMode {
		ToRgb = "to rgb",
		FromRgb = "from rgb",
	}
	export class HslNode extends NodeWithOverloads<RgbMode> {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "HSL";
		static readonly DESC = "desc.node.hsl";
		static readonly outputDisplayType = OutputDisplayType.Vec;

		static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload<Color | number>>([
			[RgbMode.ToRgb, new Overload(
				"To RGB",
				node => [
					new Socket(node, true, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
					new Socket(node, true, Socket.Type.Float, "Saturation"),
					new Socket(node, true, Socket.Type.Float, "Lightness"),
				],
				node => [
					new Socket(node, false, Socket.Type.Vector, "RGB"),
				],
				(ins, outs, context) => cm.hslToRgb(ins.map(socket => socket.inValue(context)) as Color) as Color,
			)],

			[RgbMode.FromRgb, new Overload(
				"From RGB",
				node => [
					new Socket(node, true, Socket.Type.Vector, "RGB"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
					new Socket(node, false, Socket.Type.Float, "Saturation"),
					new Socket(node, false, Socket.Type.Float, "Lightness"),
				],
				(ins, outs, context) => cm.rgbToHsl(ins[0].inValue(context) as Vec3)[outs.indexOf(context.socket!)],
			)],
		]));

		constructor() {
			super(RgbMode.ToRgb);
		}

		display(context: NodeEvalContext) {
			switch (this.overloadManager.mode) {
				default:
				case RgbMode.ToRgb:
					return {
						values: this.output(context) as any as Vec3,
						labels: ["R", "G", "B"],
						flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
					};

				case RgbMode.FromRgb:
					return {
						values: [
							this.output({ ...context, socket: this.outs[0] }),
							this.output({ ...context, socket: this.outs[1] }),
							this.output({ ...context, socket: this.outs[2] }),
						] as Vec3,
						labels: ["H", "S", "L"],
						flags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
					};
			}
		}
	}

	export class HsvNode extends NodeWithOverloads<RgbMode> {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "HSV";
		static readonly DESC = "desc.node.hsv";
		static readonly outputDisplayType = OutputDisplayType.Vec;

		static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload<Color | number>>([
			[RgbMode.ToRgb, new Overload(
				"To RGB",
				node => [
					new Socket(node, true, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
					new Socket(node, true, Socket.Type.Float, "Saturation"),
					new Socket(node, true, Socket.Type.Float, "Value"),
				],
				node => [
					new Socket(node, false, Socket.Type.Vector, "RGB"),
				],
				(ins, outs, context) => cm.hsvToRgb(ins.map(socket => socket.inValue(context)) as Color) as Color,
			)],

			[RgbMode.FromRgb, new Overload(
				"From RGB",
				node => [
					new Socket(node, true, Socket.Type.Vector, "RGB"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
					new Socket(node, false, Socket.Type.Float, "Saturation"),
					new Socket(node, false, Socket.Type.Float, "Value"),
				],
				(ins, outs, context) => cm.rgbToHsv(ins[0].inValue(context) as Vec3)[outs.indexOf(context.socket!)],
			)],
		]));

		constructor() {
			super(RgbMode.ToRgb);
		}

		display(context: NodeEvalContext) {
			switch (this.overloadManager.mode) {
				default:
				case RgbMode.ToRgb:
					return {
						values: this.output(context) as any as Vec3,
						labels: ["R", "G", "B"],
						flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
					};

				case RgbMode.FromRgb:
					return {
						values: [
							this.output({ ...context, socket: this.outs[0] }),
							this.output({ ...context, socket: this.outs[1] }),
							this.output({ ...context, socket: this.outs[2] }),
						] as Vec3,
						labels: ["H", "S", "V"],
						flags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
					};
			}
		}
	}

	export class HwbNode extends NodeWithOverloads<RgbMode> {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "HWB";
		static readonly DESC = "desc.node.hwb";
		static readonly outputDisplayType = OutputDisplayType.Vec;

		static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload<Color | number>>([
			[RgbMode.ToRgb, new Overload(
				"To RGB",
				node => [
					new Socket(node, true, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
					new Socket(node, true, Socket.Type.Float, "Whiteness"),
					new Socket(node, true, Socket.Type.Float, "Blackness"),
				],
				node => [
					new Socket(node, false, Socket.Type.Vector, "RGB"),
				],
				(ins, outs, context) => cm.hwbToRgb(ins.map(socket => socket.inValue(context)) as Color) as Color,
			)],

			[RgbMode.FromRgb, new Overload(
				"From RGB",
				node => [
					new Socket(node, true, Socket.Type.Vector, "RGB"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
					new Socket(node, false, Socket.Type.Float, "Whiteness"),
					new Socket(node, false, Socket.Type.Float, "Blackness"),
				],
				(ins, outs, context) => cm.rgbToHwb(ins[0].inValue(context) as Vec3)[outs.indexOf(context.socket!)],
			)],
		]));

		constructor() {
			super(RgbMode.ToRgb);
		}

		display(context: NodeEvalContext) {
			switch (this.overloadManager.mode) {
				default:
				case RgbMode.ToRgb:
					return {
						values: this.output(context) as any as Vec3,
						labels: ["R", "G", "B"],
						flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
					};

				case RgbMode.FromRgb:
					return {
						values: [
							this.output({ ...context, socket: this.outs[0] }),
							this.output({ ...context, socket: this.outs[1] }),
							this.output({ ...context, socket: this.outs[2] }),
						] as Vec3,
						labels: ["H", "W", "B"],
						flags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
					};
			}
		}
	}

	export class CmyNode extends NodeWithOverloads<RgbMode> {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "CMY";
		static readonly DESC = "desc.node.cmy";
		static readonly outputDisplayType = OutputDisplayType.Vec;

		static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload<Color | number>>([
			[RgbMode.ToRgb, new Overload(
				"To RGB",
				node => [
					new Socket(node, true, Socket.Type.Float, "Cyan").flag(SocketFlag.Rgb),
					new Socket(node, true, Socket.Type.Float, "Magenta").flag(SocketFlag.Rgb),
					new Socket(node, true, Socket.Type.Float, "Yellow").flag(SocketFlag.Rgb),
				],
				node => [
					new Socket(node, false, Socket.Type.Vector, "RGB"),
				],
				(ins, outs, context) => cm.cmyToRgb(ins.map(socket => socket.inValue(context)) as Color) as Color,
			)],

			[RgbMode.FromRgb, new Overload(
				"From RGB",
				node => [
					new Socket(node, true, Socket.Type.Vector, "RGB"),
				],
				node => [
					new Socket(node, false, Socket.Type.Float, "Cyan").flag(SocketFlag.Rgb),
					new Socket(node, false, Socket.Type.Float, "Magenta").flag(SocketFlag.Rgb),
					new Socket(node, false, Socket.Type.Float, "Yellow").flag(SocketFlag.Rgb),
				],
				(ins, outs, context) => cm.rgbToCmy(ins[0].inValue(context) as Vec3)[outs.indexOf(context.socket!)],
			)],
		]));

		constructor() {
			super(RgbMode.ToRgb);
		}

		display(context: NodeEvalContext) {
			switch (this.overloadManager.mode) {
				default:
				case RgbMode.ToRgb:
					return {
						values: this.output(context) as any as Vec3,
						labels: ["R", "G", "B"],
						flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
					};

				case RgbMode.FromRgb:
					return {
						values: [
							this.output({ ...context, socket: this.outs[0] }),
							this.output({ ...context, socket: this.outs[1] }),
							this.output({ ...context, socket: this.outs[2] }),
						] as Vec3,
						labels: ["C", "M", "Y"],
						flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
					};
			}
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
				new Socket(this, false, Socket.Type.Vector, "XYZ"),
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
				new Socket(this, false, Socket.Type.Vector, "Vector"),
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
				new Socket(this, false, Socket.Type.Vector, "XYZ"),
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
				new Socket(this, false, Socket.Type.Vector, "XYZ"),
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
				new Socket(this, false, Socket.Type.Vector, "XYZ"),
			);

			this.width = 180;
		}

		output(context: NodeEvalContext): Vec3 {
			return [...cm.blackbody(this.inSocket.inValue(context), this.datasetSocket.inValue(context) as "2deg" | "10deg")] as any as Vec3;
		}
	}
}