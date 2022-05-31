import {Node, Socket, SocketType as St, AxisNode, NodeEvalContext} from "../Node";

import {Vec2, lerp} from "@/util";

export namespace images {
	export class GradientNode extends Node implements AxisNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Gradient";

		private readonly axisSocket: Socket<St.Dropdown>;
		private readonly boundsSockets: Socket<St.Float>[];

		get axes() {
			return [this.whichDimension];
		}

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.axisSocket = new Socket(this, true, Socket.Type.Dropdown, "Axis", false, {
					options: [
						{text: "X", value: "0"},
						{text: "Y", value: "1"},
					],
					defaultValue: "0",
				})),
				...(this.boundsSockets = [
					new Socket(this, true, Socket.Type.Float, "From", true, {
						sliderProps: {
							hasBounds: false,
						},
					}),
					new Socket(this, true, Socket.Type.Float, "To", true, {
						defaultValue: 1,
						sliderProps: {
							hasBounds: false,
						},
					}),
				]),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.Float, "Values"),
			);
		}

		get whichDimension() {
			return Number(this.axisSocket.inValue());
		}

		output(context: NodeEvalContext): number {
			const fac = context.coords?.[this.whichDimension] ?? 0;
			const value0 = this.boundsSockets[0].inValue(context);
			const value1 = this.boundsSockets[1].inValue(context);
			return lerp(value0, value1, fac);
		}
	}

	export class ImageFileNode extends Node implements AxisNode {
		static readonly TYPE = Symbol(this.name);
		static readonly LABEL = "Image file";

		private readonly inSocket: Socket<St.Image>;

		get axes() {
			return [0, 1];
		}

		constructor(pos?: Vec2) {
			super(pos);

			this.ins.push(
				(this.inSocket = new Socket(this, true, Socket.Type.Image, "File", false)),
			);

			this.outs.push(
				new Socket(this, false, Socket.Type.RgbRaw, "RGB"),
			);
		}

		output(context: NodeEvalContext) {
			const imageData = this.inSocket.inValue(context);
			if (imageData) {
				const x = Math.round((context.coords?.[0] ?? 0) * imageData.width);
				const y = Math.round((context.coords?.[1] ?? 0) * imageData.height);

				const index = (x + y * imageData.width) * 4;
				const colorData = [...imageData.data.slice(index, index + 3)]
						.map(comp => comp / 255);

				if (colorData.length === 0) return [0, 0, 0];

				return colorData;
			}
			return [0, 0, 0];
		}
	}
}