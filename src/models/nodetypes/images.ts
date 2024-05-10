import { Node, SocketType, AxisNode, NodeEvalContext, InSocket, OutSocket, webglOuts } from "../Node";

import { Vec3, lerp } from "@/util";
import { useDynamicallyTypedSockets } from "./util";
import { WebglTemplate, WebglSlot, WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace images {
  export class GradientNode extends Node implements AxisNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "gradient";

    private readonly axisSocket: InSocket<SocketType.Dropdown>;
    private readonly boundsSockets: InSocket<SocketType.Float>[];

    get axes() {
      return [this.whichDimension];
    }

    private static inputSlots = WebglSlot.ins("from", "to");
    private static outputSlots = WebglSlot.outs("val");

    constructor() {
      super();

      const {from, to} = GradientNode.inputSlots;
      const {val} = GradientNode.outputSlots;

      this.ins.push(
        (this.axisSocket = new InSocket(this, SocketType.Dropdown, "Axis", {
          showSocket: false,
          options: [
            {text: "X", value: "0"},
            {text: "Y", value: "1"},
          ],
          defaultValue: "0",
          valueChangeRequiresShaderReload: true,
        })),
        ...(this.boundsSockets = [
          new InSocket(this, SocketType.Float, "From", {
            sliderProps: {
              hasBounds: false,
            },
            webglOutputMapping: {[webglOuts.val]: from},
          }),
          new InSocket(this, SocketType.Float, "To", {
            defaultValue: 1,
            sliderProps: {
              hasBounds: false,
            },
            webglOutputMapping: {[webglOuts.val]: to},
          }),
        ]),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Float, "Values", context => {
          const fac = context.coords?.[this.whichDimension] ?? 0;
          const value0 = this.boundsSockets[0].inValue(context);
          const value1 = this.boundsSockets[1].inValue(context);
          return lerp(value0, value1, fac);
        }, {
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.slot(val)}),
        }),
      );
    }

    get whichDimension() {
      return Number(this.axisSocket.inValue());
    }

    webglBaseVariables(context: NodeEvalContext={}): WebglVariables {
      const {from, to} = GradientNode.inputSlots;
      const {val} = GradientNode.outputSlots;

      return WebglVariables.templateConcat`float ${val} = mix(${from}, ${to}, coords.${this.whichDimension === 0 ? "x" : "y * -1."});`({
        node: this,
      });
    }
  }

  export class ImageFileNode extends Node implements AxisNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "imageFile";

    private readonly imageSocket: InSocket<SocketType.Image>;
    private readonly normalizeCoordinatesSocket: InSocket<SocketType.Bool>

    get axes() {
      return [0, 1];
    }

    private static readonly outputSlots = WebglSlot.outs("val", "texture", "width", "height");

    constructor() {
      super();

      this.ins.push(
        (this.imageSocket = new InSocket(this, SocketType.Image, "File", {showSocket: false})),
        (this.normalizeCoordinatesSocket = new InSocket(this, SocketType.Bool, "Normalize coordinates", {
          showSocket: false,
          defaultValue: true,
        })),
      );

      const {val, width, height} = ImageFileNode.outputSlots;

      this.outs.push(
        new OutSocket(this, SocketType.Vector, "RGB", context => {
          const imageData = this.imageSocket.inValue(context);
          if (!imageData) return [0, 0, 0] as Vec3;

          const [x, y] = this.getImageDataCoords(imageData, context);
          const index = (x + y * imageData.width) * 4;
          const colorData = [...imageData.data.slice(index, index + 3)]
              .map(comp => comp / 255);
  
          if (colorData.length === 0) return [0, 0, 0] as Vec3;
  
          return colorData as Vec3;
        }, {
          webglOutputs: socket => () => ({
            [webglOuts.val]: WebglTemplate.source`${val}.rgb`,
          }),
        }),
        new OutSocket(this, SocketType.Float, "Alpha", context => {
          const imageData = this.imageSocket.inValue(context);
          if (!imageData) return 0;

          const [x, y] = this.getImageDataCoords(imageData, context);
          const index = (x + y * imageData.width) * 4;
          return index + 3 < imageData.data.length
              ? imageData.data[index + 3] / 255
              : 0;
        }, {
          webglOutputs: socket => () => ({
            [webglOuts.val]: WebglTemplate.source`${val}.a`,
          }),
        }),
        new OutSocket(this, SocketType.Float, "Width", context => this.imageSocket.inValue(context)?.width ?? 0, {
          constant: true,
          webglOutputs: socket => () => ({
            [webglOuts.val]: WebglTemplate.slot(width),
          }),
        }),
        new OutSocket(this, SocketType.Float, "Height", context => this.imageSocket.inValue(context)?.height ?? 0, {
          constant: true,
          webglOutputs: socket => () => ({
            [webglOuts.val]: WebglTemplate.slot(height),
          }),
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
    
    webglBaseVariables(context?: NodeEvalContext): WebglVariables {
      const {val, texture, width, height} = ImageFileNode.outputSlots;
      
      return WebglVariables.template`vec4 ${val} = texture(${texture}, coords);`({
        node: this,
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
  }

  export class SampleNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "sample";

    private readonly coordsSockets: [InSocket<SocketType.Float>, InSocket<SocketType.Float>];

    private static readonly inputSlots = WebglSlot.ins("x", "y");
    private static readonly outputSlots = WebglSlot.outs("evaluateInput", "val", "color");

    constructor() {
      super();

      const dynamicTyping = useDynamicallyTypedSockets(
        () => [this.ins[0]],
        () => [this.outs[0]],
      );

      const {x, y} = SampleNode.inputSlots;
      const {val, color} = SampleNode.outputSlots;

      this.ins.push(
        new InSocket(this, SocketType.Any, "Source", {
          ...dynamicTyping.inSocketOptions,
          constant: true,
        }),
        ...(this.coordsSockets = [
          new InSocket(this, SocketType.Float, "X", {webglOutputMapping: {[webglOuts.val]: x}}),
          new InSocket(this, SocketType.Float, "Y", {webglOutputMapping: {[webglOuts.val]: y}}),
        ])
      );

      this.outs.push(
        new OutSocket(this, SocketType.Any, "Output", context => {
          return this.ins[0].inValue({
            coords: this.coordsSockets.map(socket => socket.inValue(context)) as [number, number],
          });
        }, {
          ...dynamicTyping.outSocketOptions,
          constant: true,
          webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.slot(val)}),
        }),
      );
    }
    
    webglBaseVariables(context?: NodeEvalContext): WebglVariables {
      const {x, y} = SampleNode.inputSlots;
      const {evaluateInput, color, val} = SampleNode.outputSlots;

      switch (this.outs[0].type) {
        case SocketType.ColorComponents: {
          return this.ins[0].hasLinks
              ? WebglVariables.template`Color ${color} = ${evaluateInput}(vec2(${x}, ${y}));`({
                node: this,
                functionInputDependencies: new Map([
                  [WebglTemplate.slot(evaluateInput), this.ins[0].link.src],
                ]),
              })

              : WebglVariables.template`Color ${color} = Color(vec3(0., 0., 0.), illuminant2_D65, vec3(0., 0., 0.));`({
                node: this,
              });
        }

        case SocketType.Vector:
        case SocketType.VectorOrColor:
          return this.ins[0].hasLinks
              ? WebglVariables.template`vec3 ${val} = ${evaluateInput}(vec2(${x}, ${y}));`({
                node: this,
                functionInputDependencies: new Map([
                  [WebglTemplate.slot(evaluateInput), this.ins[0].link.src],
                ]),
              })

              : WebglVariables.template`vec3 ${val} = vec3(0., 0., 0.);`({
                node: this,
              });

        case SocketType.Float:
          return this.ins[0].hasLinks
              ? WebglVariables.template`float ${val} = ${evaluateInput}(vec2(${x}, ${y}));`({
                node: this,
                functionInputDependencies: new Map([
                  [WebglTemplate.slot(evaluateInput), this.ins[0].link.src],
                ]),
              })

              : WebglVariables.template`float ${val} = 0.;`({
                node: this,
              });

        case SocketType.Bool:
          return this.ins[0].hasLinks
              ? WebglVariables.template`bool ${val} = ${evaluateInput}(vec2(${x}, ${y}));`({
                node: this,
                functionInputDependencies: new Map([
                  [WebglTemplate.slot(evaluateInput), this.ins[0].link.src],
                ]),
              })

              : WebglVariables.template`bool ${val} = false;`({
                node: this,
              });

        default:
          throw new Error("type not acceptable");
      }
    }
  }
}