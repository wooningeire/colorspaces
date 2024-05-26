import { Node, SocketType, AxisNode, NodeEvalContext, InSocket, OutSocket, webglStdOuts, Socket, SliderProps, Tree } from "../Node";

import { Vec3, lerp } from "@/util";
import { useDynamicallyTypedSockets } from "./util";
import { WebglTemplate, WebglSlot, WebglVariables } from "@/webgl-compute/WebglVariables";
import { toRaw } from "vue";

export namespace images {
  export class CoordinatesNode extends Node implements AxisNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "coordinates";

    // TODO attach this property to the sockets instead of the node
    get axes() {
      return [0, 1];
    }

    private static outputSlots = WebglSlot.outs("x", "y");

    constructor() {
      super();

      const {x, y} = CoordinatesNode.outputSlots;

      this.outs.push(
        new OutSocket(this, SocketType.Float, "label.socket.x", context => context.coords?.[0] ?? 0, {
          webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.source`coords.x`}),
        }),
        new OutSocket(this, SocketType.Float, "label.socket.y", context => context.coords?.[0] ?? 0, {
          webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.source`coords.y`}),
        }),
        new OutSocket(this, SocketType.Vector, "label.socket.vector", context => [context.coords?.[0] ?? 0, context.coords?.[1] ?? 0, 0] as Vec3, {
          webglOutputs: socket => () => ({[webglStdOuts.vector]: WebglTemplate.source`vec3(coords, 0.)`}),
        }),
      );
    }
  }

  export class GradientNode extends Node implements AxisNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "gradient";

    private readonly axisSocket: InSocket<SocketType.Dropdown>;
    private readonly typeSocket: InSocket<SocketType.Dropdown>;
    private readonly nStopsSocket: InSocket<SocketType.Integer>;
    private stopsSockets: {
      positionSocket: InSocket<SocketType.Float>,
      valueSocket: InSocket<SocketType.Float | SocketType.Vector>,
    }[] = [];
    private stopsSlots: {
      position: WebglSlot,
      value: WebglSlot,
    }[] = [];

    get axes() {
      return [this.whichDimension];
    }

    private static outputSlots = WebglSlot.outs("val");

    constructor() {
      super();

      const {val} = GradientNode.outputSlots;

      const recreateStopSockets = () => {
        for (const {valueSocket, positionSocket} of this.stopsSockets) {
          valueSocket.delete();
          positionSocket.delete();
        }

        const {sockets, slots} = this.createStopSockets();
        this.ins.push(...sockets.flatMap(Object.values));
        this.stopsSockets = sockets;
        this.stopsSlots = slots;
      };
      const recreateOutputSocket = () => {
        const getLeftStopIndex = (context: NodeEvalContext) => {
          const fac = context.coords?.[this.whichDimension] ?? 0;
          const stopsPrecomputed = this.stopsSockets.map(({positionSocket, valueSocket}) => ({position: positionSocket.inValue(context), valueSocket}));
          
          let leftStopIndex = -1;
          for (const [i, stop] of stopsPrecomputed.entries()) {
            if (fac < stop.position) continue;
            
            leftStopIndex = i;
            break;
          }

          return {fac, stopsPrecomputed, leftStopIndex};
        };

        this.outs[0]?.delete();
        this.outs.push(
          this.typeSocket.inValue() === "float"
              ? new OutSocket(this, SocketType.Float, "label.socket.gradient.values", context => {
                const {fac, stopsPrecomputed, leftStopIndex} = getLeftStopIndex(context);

                if (leftStopIndex === -1) {
                  return stopsPrecomputed[0].valueSocket.inValue(context) as number;
                }
                if (leftStopIndex === stopsPrecomputed.length - 1) {
                  return stopsPrecomputed.at(-1)!.valueSocket.inValue(context) as number;
                }
      
                const leftStop = stopsPrecomputed[leftStopIndex];
                const rightStop = stopsPrecomputed[leftStopIndex + 1];
      
                const value0 = leftStop.valueSocket.inValue(context) as number;
                if (fac === leftStop.position) {
                  return value0;
                }
      
                const value1 = rightStop.valueSocket.inValue(context) as number;
                return lerp(value0, value1, (fac - leftStop.position) / (rightStop.position - leftStop.position));
              }, {
                webglOutputs: socket => () => ({[webglStdOuts.float]: WebglTemplate.slot(val)}),
              })
              : new OutSocket(this, SocketType.Vector, "label.socket.gradient.values", context => {
                const {fac, stopsPrecomputed, leftStopIndex} = getLeftStopIndex(context);

                if (leftStopIndex === -1) {
                  return stopsPrecomputed[0].valueSocket.inValue(context) as Vec3;
                }
                if (leftStopIndex === stopsPrecomputed.length - 1) {
                  return stopsPrecomputed.at(-1)!.valueSocket.inValue(context) as Vec3;
                }
      
                const leftStop = stopsPrecomputed[leftStopIndex];
                const rightStop = stopsPrecomputed[leftStopIndex + 1];
      
                const value0 = leftStop.valueSocket.inValue(context) as Vec3;
                if (fac === leftStop.position) {
                  return value0;
                }
      
                const value1 = rightStop.valueSocket.inValue(context) as Vec3;
                return value0.map((_, i) => lerp(value0[i], value1[i], (fac - leftStop.position) / (rightStop.position - leftStop.position))) as Vec3;
              }, {
                webglOutputs: socket => () => ({[webglStdOuts.vector]: WebglTemplate.slot(val)}),
              }),
        );
      };

      this.ins.push(
        (this.axisSocket = new InSocket(this, SocketType.Dropdown, "label.socket.gradient.axis", {
          showSocket: false,
          options: [
            {text: "label.socket.x", value: "0"},
            {text: "label.socket.y", value: "1"},
          ],
          defaultValue: "0",
          valueChangeRequiresShaderReload: true,
        })),
        (this.typeSocket = new InSocket(this, SocketType.Dropdown, "label.socket.gradient.type", {
          showSocket: false,
          defaultValue: "vector",
          options: [
            {text: "label.socketType.float", value: "float"},
            {text: "label.socketType.vector", value: "vector"},
          ],
          onValueChange: () => {
            recreateStopSockets();
            recreateOutputSocket();
          },
          valueChangeRequiresShaderReload: true,
        })),
        (this.nStopsSocket = new InSocket(this, SocketType.Integer, "label.socket.gradient.nStops", {
          constant: true,
          defaultValue: 2,
          sliderProps: {
            min: 1,
            hasBounds: false,
          },
          onValueChange: recreateStopSockets,
          valueChangeRequiresShaderReload: true,
        })),
      );
      recreateStopSockets();
      recreateOutputSocket();
    }

    private createStopSockets() {
      const stopType = this.typeSocket.inValue();
      const nStops = this.nStopsSocket.inValue();

      const slots = new Array(nStops).fill(0).map((_, i) => ({
        position: WebglSlot.in(`position_${i}`),
        value: WebglSlot.in(`value_${i}`),
      }));

      return {
        sockets: new Array(nStops).fill(0)
            .map((_, i) => ({
              positionSocket: new InSocket(this, SocketType.Float, "label.socket.gradient.stopIPosition", {
                defaultValue: nStops === 1 ? 0.5 : i / (nStops - 1),
                sliderProps: {
                  softMin: 0,
                  softMax: 1,
                },
                webglOutputMappingStatic: {[webglStdOuts.float]: slots[i].position},
                labelSubstitutions: [String(i)],
              }),
              valueSocket: stopType === "float" 
                  ? new InSocket(this, SocketType.Float, "label.socket.gradient.stopIValue", {
                    sliderProps: {
                      hasBounds: false,
                    },
                    webglOutputMappingStatic: {[webglStdOuts.float]: slots[i].value},
                    labelSubstitutions: [String(i)],
                  })
                  : new InSocket(this, SocketType.Vector, "label.socket.gradient.stopIValue", {
                    sliderProps: [
                      {
                        hasBounds: false,
                      },
                      {
                        hasBounds: false,
                      },
                      {
                        hasBounds: false,
                      },
                    ],
                    webglOutputMappingStatic: {[webglStdOuts.vector]: slots[i].value},
                    labelSubstitutions: [String(i)],
                  })
            })),
        slots,
      };
    }

    get whichDimension() {
      return Number(this.axisSocket.inValue());
    }


    webglBaseVariables(context: NodeEvalContext={}): WebglVariables {
      const {val} = GradientNode.outputSlots;
      const fac = WebglSlot.out("fac");

      const stopsPrecomputed = this.stopsSockets.map(({positionSocket, valueSocket}, i) => ({position: positionSocket.inValue(context), valueSocket}));

      const slots = (index: number) => toRaw(this.stopsSlots.at(index)!); // toRaw included due to VueJS inconsistency

      return WebglVariables.templateConcat`float ${fac} = coords.${this.whichDimension === 0 ? "x" : "y"};
${this.typeSocket.inValue() === "float" ? "float" : "vec3"} ${val} =
    ${fac} < ${slots(0).position} ? ${slots(0).value} :
    ${WebglTemplate.merge(
      ...new Array(stopsPrecomputed.length - 1).fill(0)
          .map((_, i) => {
            const leftPos = slots(i).position;
            const rightPos = slots(i + 1).position;
            return WebglTemplate.source`${fac} < ${rightPos} ? mix(${slots(i).value}, ${slots(i + 1).value}, (${fac} - ${leftPos}) / (${rightPos} - ${leftPos})) :`;
          })
    )}
    ${slots(-1).value};`({
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

    width = 200;

    constructor() {
      super();

      this.ins.push(
        (this.imageSocket = new InSocket(this, SocketType.Image, "label.socket.imageFile.file", {showSocket: false})),
        (this.normalizeCoordinatesSocket = new InSocket(this, SocketType.Bool, "label.socket.normalizeCoordinates", {
          showSocket: false,
          defaultValue: true,
        })),
      );

      const {val, width, height} = ImageFileNode.outputSlots;

      this.outs.push(
        new OutSocket(this, SocketType.Vector, "label.rgb", context => {
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
            [webglStdOuts.vector]: WebglTemplate.source`${val}.rgb`,
          }),
          desc: "desc.socket.imageFileRgb",
        }),
        new OutSocket(this, SocketType.Float, "label.socket.alpha", context => {
          const imageData = this.imageSocket.inValue(context);
          if (!imageData) return 0;

          const [x, y] = this.getImageDataCoords(imageData, context);
          const index = (x + y * imageData.width) * 4;
          return index + 3 < imageData.data.length
              ? imageData.data[index + 3] / 255
              : 0;
        }, {
          webglOutputs: socket => () => ({
            [webglStdOuts.float]: WebglTemplate.source`${val}.a`,
          }),
          desc: "desc.socket.imageFileRgb",
        }),
        new OutSocket(this, SocketType.Integer, "label.socket.width", context => this.imageSocket.inValue(context)?.width ?? 0, {
          constant: true,
          webglOutputs: socket => () => ({
            [webglStdOuts.integer]: WebglTemplate.slot(width),
          }),
          desc: "desc.socket.imageFileWidth",
        }),
        new OutSocket(this, SocketType.Integer, "label.socket.height", context => this.imageSocket.inValue(context)?.height ?? 0, {
          constant: true,
          webglOutputs: socket => () => ({
            [webglStdOuts.integer]: WebglTemplate.slot(height),
          }),
          desc: "desc.socket.imageFileHeight",
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
        new InSocket(this, SocketType.DynamicAny, "label.socket.sample.source", {
          ...dynamicTyping.inSocketOptions(val),
          constant: true,
        }),
        ...(this.coordsSockets = [
          new InSocket(this, SocketType.Float, "label.socket.x", {webglOutputMappingStatic: {[webglStdOuts.float]: x}}),
          new InSocket(this, SocketType.Float, "label.socket.y", {webglOutputMappingStatic: {[webglStdOuts.float]: y}}),
        ])
      );

      this.outs.push(
        new OutSocket(this, SocketType.DynamicAny, "label.socket.value", context => {
          return this.ins[0].inValue({
            coords: this.coordsSockets.map(socket => socket.inValue(context)) as [number, number],
          });
        }, {
          ...dynamicTyping.outSocketOptions(WebglTemplate.slot(val)),
          constant: true,
        }),
      );
    }
    
    webglBaseVariables(context?: NodeEvalContext): WebglVariables {
      const {x, y} = SampleNode.inputSlots;
      const {evaluateInput, color, val} = SampleNode.outputSlots;

      switch (this.outs[0].type) {
        case SocketType.Color: {
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