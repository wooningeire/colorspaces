import {Node, Socket, SocketType as St, AxisNode, NodeEvalContext, InSocket, OutSocket, Tree} from "../Node";

import {Vec2, lerp} from "@/util";
import { volatileInSocketOptions, volatileOutSocketOptions } from "./util";

export namespace images {
  export class GradientNode extends Node implements AxisNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Gradient";
    static readonly DESC = "desc.node.gradient";

    private readonly axisSocket: Socket<St.Dropdown>;
    private readonly boundsSockets: Socket<St.Float>[];

    get axes() {
      return [this.whichDimension];
    }

    constructor() {
      super();

      this.ins.push(
        (this.axisSocket = new InSocket(this, Socket.Type.Dropdown, "Axis", false, {
          options: [
            {text: "X", value: "0"},
            {text: "Y", value: "1"},
          ],
          defaultValue: "0",
        })),
        ...(this.boundsSockets = [
          new InSocket(this, Socket.Type.Float, "From", true, {
            sliderProps: {
              hasBounds: false,
            },
          }),
          new InSocket(this, Socket.Type.Float, "To", true, {
            defaultValue: 1,
            sliderProps: {
              hasBounds: false,
            },
          }),
        ]),
      );

      this.outs.push(
        new OutSocket(this, Socket.Type.Float, "Values"),
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
    static readonly DESC = "desc.node.imageFile";

    private readonly inSocket: Socket<St.Image>;
    private readonly normalizeCoordinatesSocket: Socket<St.Bool>

    get axes() {
      return [0, 1];
    }

    constructor() {
      super();

      this.ins.push(
        (this.inSocket = new InSocket(this, St.Image, "File", false)),
        (this.normalizeCoordinatesSocket = new InSocket(this, St.Bool, "Normalize coordinates", false, {
          defaultValue: true,
        })),
      );

      this.outs.push(
        new OutSocket(this, St.Vector, "RGB"),
        new OutSocket(this, St.Float, "Width"),
        new OutSocket(this, St.Float, "Height"),
      );
    }

    output(context: NodeEvalContext) {
      const imageData = this.inSocket.inValue(context);
      if (imageData) {
        if (context.socket === this.outs[1]) {
          return imageData.width;
        }
        if (context.socket === this.outs[2]) {
          return imageData.height;
        }


        const [x, y] = this.normalizeCoordinatesSocket.inValue(context)
            ? [
              Math.round((context.coords?.[0] ?? 0) * imageData.width),
              Math.round((context.coords?.[1] ?? 0) * imageData.height),
            ]
            : [
              Math.round(context.coords?.[0] ?? 0),
              Math.round(context.coords?.[1] ?? 0),
            ];

        const index = (x + y * imageData.width) * 4;
        const colorData = [...imageData.data.slice(index, index + 3)]
            .map(comp => comp / 255);

        if (colorData.length === 0) return [0, 0, 0];

        return colorData;
      }
      switch (context.socket) {
        default:
        case this.outs[0]: return [0, 0, 0];
        case this.outs[1]: return 0;
        case this.outs[2]: return 0;
      }
    }
  }

  export class SampleNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Sample";
    static readonly DESC = "desc.node.sample";

    private readonly coordsSockets: [InSocket<St.Float>, InSocket<St.Float>];

    constructor() {
      super();

      this.ins.push(
        new InSocket(this, St.Any, "Source", true, volatileInSocketOptions(this.ins, this.outs)),
        ...(this.coordsSockets = [
          new InSocket(this, St.Float, "X"),
          new InSocket(this, St.Float, "Y"),
        ])
      );

      this.outs.push(
        new OutSocket(this, St.Any, "Output", true, volatileOutSocketOptions(this.ins, this.outs)),
      );
    }

    output(context: NodeEvalContext) {
      const output = this.ins[0].inValue({
        coords: this.coordsSockets.map(socket => socket.inValue(context)) as [number, number],
      });

      return output;
    }

    getDependencyAxes() {
      const axes = new Set<number>();

      for (const socket of this.ins.slice(1)) {
        for (const link of socket.links) {
          if (link.causesCircularDependency) continue;
          for (const axis of link.srcNode.getDependencyAxes()) {
            axes.add(axis);
          }
        }
      }

      return axes;
    }
  }
}