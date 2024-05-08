import {Node, Socket, SocketType as St, AxisNode, NodeEvalContext, InSocket, OutSocket, Tree, WebglSocketValue} from "../Node";

import {Vec2, Vec3, lerp} from "@/util";
import { volatileInSocketOptions, volatileOutSocketOptions } from "./util";
import { WebglTemplate, WebglSlot, WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace images {
  export class GradientNode extends Node implements AxisNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "gradient";

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
        new OutSocket(this, Socket.Type.Float, "Values", context => {
          const fac = context.coords?.[this.whichDimension] ?? 0;
          const value0 = this.boundsSockets[0].inValue(context);
          const value1 = this.boundsSockets[1].inValue(context);
          return lerp(value0, value1, fac);
        }),
      );
    }

    get whichDimension() {
      return Number(this.axisSocket.inValue());
    }

    private static inputSlots = {
      from: WebglSlot.in("from"),
      to: WebglSlot.in("to"),
    };

    webglGetBaseVariables(context: NodeEvalContext={}): WebglVariables {
      const val = WebglSlot.out("val");

      const {from, to} = GradientNode.inputSlots;

      return WebglVariables.templateConcat`float ${val} = mix(${from}, ${to}, coords.${this.whichDimension === 0 ? "x" : "y * -1."});`({
        socketOutVariables: new Map([
          [this.outs[0], {
            "val": WebglTemplate.source`${val}`,
          }]
        ]),
      });
    }

    webglGetMapping<T extends St>(inSocket: InSocket<any>) {
      const {from, to} = GradientNode.inputSlots;

      switch (inSocket) {
        case this.boundsSockets[0]: return <WebglSocketValue<T>>{"val": from};
        case this.boundsSockets[1]: return <WebglSocketValue<T>>{"val": to};
        default: return null;
      }
    }
  }

  export class ImageFileNode extends Node implements AxisNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "imageFile";

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
        new OutSocket(this, St.Vector, "RGB", context => {
          const imageData = this.imageSocket.inValue(context);
          if (!imageData) return [0, 0, 0] as Vec3;

          const [x, y] = this.getImageDataCoords(imageData, context);
          const index = (x + y * imageData.width) * 4;
          const colorData = [...imageData.data.slice(index, index + 3)]
              .map(comp => comp / 255);
  
          if (colorData.length === 0) return [0, 0, 0] as Vec3;
  
          return colorData as Vec3;
        }),
        new OutSocket(this, St.Float, "Alpha", context => {
          const imageData = this.imageSocket.inValue(context);
          if (!imageData) return 0;

          const [x, y] = this.getImageDataCoords(imageData, context);
          const index = (x + y * imageData.width) * 4;
          return index + 3 < imageData.data.length
              ? imageData.data[index + 3] / 255
              : 0;
        }),
        new OutSocket(this, St.Float, "Width", context => this.imageSocket.inValue(context)?.width ?? 0, true, {
          constant: true,
        }),
        new OutSocket(this, St.Float, "Height", context => this.imageSocket.inValue(context)?.height ?? 0, true, {
          constant: true,
        }),
      );
    }

    private getImageDataCoords(imageData: ImageData, context: NodeEvalContext) {
      return this.normalizeCoordinatesSocket.inValue(context)
          ? [
            Math.round((context.coords?.[0] ?? 0) * imageData.width),
            Math.round((context.coords?.[1] ?? 0) * imageData.height),
          ]
          : [
            Math.round(context.coords?.[0] ?? 0),
            Math.round(context.coords?.[1] ?? 0),
          ];
    }
    
    webglGetBaseVariables(context?: NodeEvalContext): WebglVariables {
      const {val, texture, width, height} = WebglSlot.outs("val", "texture", "width", "height");

      return WebglVariables.template`vec4 ${val} = texture(${texture}, coords);`({
        socketOutVariables: new Map([
          [this.outs[0], {
            "val": WebglTemplate.source`${val}.rgb`,
          }],
          [this.outs[1], {
            "val": WebglTemplate.source`${val}.a`,
          }],
          [this.outs[2], {
            "val": WebglTemplate.slot(width),
          }],
          [this.outs[3], {
            "val": WebglTemplate.slot(height),
          }],
        ]),
        preludeTemplate: WebglTemplate.source`uniform sampler2D ${texture};
uniform float ${width};
uniform float ${height};`,
        uniforms: new Map([
          [WebglTemplate.slot(texture), {
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
            dependencyNodes: [],
          }],

          [WebglTemplate.slot(width), {
            set: (gl, unif) => {
              gl.uniform1i(unif, this.imageSocket.fieldValue?.width ?? 0);
            },
            dependencySockets: [this.imageSocket],
            dependencyNodes: [],
          }],

          [WebglTemplate.slot(height), {
            set: (gl, unif) => {
              gl.uniform1i(unif, this.imageSocket.fieldValue?.height ?? 0);
            },
            dependencySockets: [this.imageSocket],
            dependencyNodes: [],
          }],
        ]),
      });
    }

    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      return null;
    }
  }

  export class SampleNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "sample";

    private readonly coordsSockets: [InSocket<St.Float>, InSocket<St.Float>];

    constructor() {
      super();

      this.ins.push(
        new InSocket(this, St.Any, "Source", true, Object.assign({constant: true}, volatileInSocketOptions(this.ins, this.outs))),
        ...(this.coordsSockets = [
          new InSocket(this, St.Float, "X"),
          new InSocket(this, St.Float, "Y"),
        ])
      );

      this.outs.push(
        new OutSocket(this, St.Any, "Output", context => {
          return this.ins[0].inValue({
            coords: this.coordsSockets.map(socket => socket.inValue(context)) as [number, number],
          });
        }, true, Object.assign({constant: true}, volatileOutSocketOptions(this.ins, this.outs))),
      );
    }

    private static readonly inputSlots = WebglSlot.ins("x", "y");
    
    webglGetBaseVariables(context?: NodeEvalContext): WebglVariables {
      const {x, y} = SampleNode.inputSlots;

      const evaluateInput = WebglSlot.out("evaluateOutput");

      switch (this.outs[0].type) {
        case St.ColorCoords: {
          const color = WebglSlot.out("color");

          return WebglVariables.template`Color ${color} = ${evaluateInput}(vec2(${x}, ${y}))`({
            socketOutVariables: new Map([
              [this.outs[0], {
                "val": WebglTemplate.source`${color}.val`,
                "illuminant": WebglTemplate.source`${color}.illuminant`,
                "xyz": WebglTemplate.source`${color}.xyz`,
              }],
            ]),
            functionInputDependencies: new Map([
              [WebglTemplate.source`${evaluateInput}`, this.ins[0].link.src],
            ]),
          });
        }

        case St.Vector:
        case St.VectorOrColor: {
          const val = WebglSlot.out("val");

          return WebglVariables.template`vec3 ${val} = ${evaluateInput}(vec2(${x}, ${y}))`({
            socketOutVariables: new Map([
              [this.outs[0], {
                "val": WebglTemplate.source`${val}`,
              }],
            ]),
            functionInputDependencies: new Map([
              [WebglTemplate.source`${evaluateInput}`, this.ins[0].link.src],
            ]),
          });
        }

        case St.Float: {
          const val = WebglSlot.out("val");

          return WebglVariables.template`float ${val} = ${evaluateInput}(vec2(${x}, ${y}))`({
            socketOutVariables: new Map([
              [this.outs[0], {
                "val": WebglTemplate.source`${val}`,
              }],
            ]),
            functionInputDependencies: new Map([
              [WebglTemplate.source`${evaluateInput}`, this.ins[0].link.src],
            ]),
          });
        }

        default:
          throw new Error("type not acceptable");
      }
    }

    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      const {x, y} = SampleNode.inputSlots;

      switch (inSocket) {
        case this.ins[1]: return <WebglSocketValue<T>>{"val": x};
        case this.ins[2]: return <WebglSocketValue<T>>{"val": y};
        default: return null;
      }
    }
  }
}