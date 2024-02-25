import {Node, Socket, SocketType as St, AxisNode, NodeEvalContext, InSocket, OutSocket, Tree, WebglSocketValue} from "../Node";

import {Vec2, lerp} from "@/util";
import { volatileInSocketOptions, volatileOutSocketOptions } from "./util";
import { WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace images {
  export class GradientNode extends Node implements AxisNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Gradient";
    static readonly DESC = "desc.node.gradient";

    private readonly axisSocket: InSocket<St.Dropdown>;
    private readonly boundsSockets: InSocket<St.Float>[];

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
          valueChangeRequiresShaderReload: true,
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

    webglGetBaseVariables(context: NodeEvalContext={}): WebglVariables {
      return new WebglVariables(
        `float {0:val} = mix({from}, {to}, coords.${this.whichDimension === 0 ? "x" : "y * -1."});`,
        new Map([
          [this.outs[0], {
            "val": "{0:val}",
          }]
        ]),
      ).nameVariableSlots(3);
    }

    webglGetMapping<T extends St>(inSocket: InSocket<any>) {
      switch (inSocket) {
        case this.boundsSockets[0]: return <WebglSocketValue<T>>{"val": "from"};
        case this.boundsSockets[1]: return <WebglSocketValue<T>>{"val": "to"};
        default: return null;
      }
    }
  }

  export class ImageFileNode extends Node implements AxisNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Image file";
    static readonly DESC = "desc.node.imageFile";

    private readonly imageSocket: InSocket<St.Image>;
    private readonly normalizeCoordinatesSocket: InSocket<St.Bool>

    get axes() {
      return [0, 1];
    }

    constructor() {
      super();

      this.ins.push(
        (this.imageSocket = new InSocket(this, St.Image, "File", false)),
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
      const imageData = this.imageSocket.inValue(context);
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
    
    webglGetBaseVariables(context?: NodeEvalContext): WebglVariables {
      return new WebglVariables(
        `vec3 {0:val} = texture({1:texture}, coords).rgb;`,
        new Map([
          [this.outs[0], {
            "val": "{0:val}",
          }],
          [this.outs[1], {
            "val": "{2:width}",
          }],
          [this.outs[2], {
            "val": "{3:height}",
          }],
        ]),
        `uniform sampler2D {1:texture};
uniform float {2:width};
uniform float {3:height};`,
        {
          "{1:texture}": {
            set: (gl, unif, nUsedTextures) => {
              const texture = gl.createTexture();
              gl.activeTexture(gl.TEXTURE0 + nUsedTextures);
              gl.bindTexture(gl.TEXTURE_2D, texture);

              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.imageSocket.fieldValue ?? new Image());
              gl.uniform1i(unif, nUsedTextures);
              
              return true;
            },
            dependencySockets: [this.imageSocket],
          },

          "{2:width}": {
            set: (gl, unif) => {
              gl.uniform1i(unif, this.imageSocket.fieldValue?.width ?? 0);
            },
            dependencySockets: [this.imageSocket],
          },

          "{3:height}": {
            set: (gl, unif) => {
              gl.uniform1i(unif, this.imageSocket.fieldValue?.height ?? 0);
            },
            dependencySockets: [this.imageSocket],
          },
        },
      ).nameVariableSlots(4);
    }

    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      return null;
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
    
    webglGetBaseVariables(context?: NodeEvalContext): WebglVariables {
      switch (this.outs[0].type) {
        case St.ColorCoords:
          return new WebglVariables(
            `Color {0:color} = {1:inputFunction}(vec2({x}, {y}));`,
            new Map([
              [this.outs[0], {
                "val": "{0:color}.val",
                "illuminant": "{0:color}.illuminant",
                "xyz": "{0:color}.xyz",
              }],
            ]),
            "",
            {},
            {
              "{1:inputFunction}": this.ins[0].link.src,
            },
          ).nameVariableSlots(2);

          case St.Vector:
          case St.VectorOrColor:
            return new WebglVariables(
              `vec3 {0:val} = {1:inputFunction}(vec2({x}, {y}));`,
              new Map([
                [this.outs[0], {
                  "val": "{0:val}",
                }],
              ]),
              "",
              {},
              {
                "{1:inputFunction}": this.ins[0].link.src,
              },
            ).nameVariableSlots(2);

          case St.Float:
            return new WebglVariables(
              `float {0:val} = {1:inputFunction}(vec2({x}, {y}));`,
              new Map([
                [this.outs[0], {
                  "val": "{0:val}",
                }],
              ]),
              "",
              {},
              {
                "{1:inputFunction}": this.ins[0].link.src,
              },
            ).nameVariableSlots(2);

        default:
          throw new Error("type not acceptable");
      }
    }

    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      switch (inSocket) {
        case this.ins[1]: return <WebglSocketValue<T>>{"val": "x"};
        case this.ins[2]: return <WebglSocketValue<T>>{"val": "y"};
        default: return null;
      }
    }
  }
}