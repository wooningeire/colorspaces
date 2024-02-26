import { Vec3 } from "@/util";
import { Socket, SocketType as St, SocketFlag, NodeEvalContext, OutputDisplayType, NodeWithOverloads, SocketOptions, InSocket, OutSocket, WebglSocketValue, NodeOutputTarget } from "../Node";
import { Overload, OverloadGroup } from "../Overload";
import * as cm from "../colormanagement";
import { StringKey } from "@/strings";
import { WebglVariables } from "@/webgl-compute/WebglVariables";



export const labSliderProps = [
  {
    max: 100,
  },
  {
    hasBounds: false,
    unboundedChangePerPixel: 0.25,
  },
  {
    hasBounds: false,
    unboundedChangePerPixel: 0.25,
  },
];

export const oklabSliderProps = [
  {
    max: 1,
  },
  {
    hasBounds: false,
    unboundedChangePerPixel: 0.0025,
  },
  {
    hasBounds: false,
    unboundedChangePerPixel: 0.0025,
  },
];

export const whitePointSocketOptions = {
  options: [
    {value: "2deg/A", text: "CIE 2° / A"},
    {value: "2deg/B", text: "CIE 2° / B"},
    {value: "2deg/C", text: "CIE 2° / C"},
    {value: "2deg/D50", text: "CIE 2° / D50"},
    {value: "2deg/D55", text: "CIE 2° / D55"},
    {value: "2deg/D60", text: "CIE 2° / D60"},
    {value: "2deg/D65", text: "CIE 2° / D65"},
    {value: "2deg/D75", text: "CIE 2° / D75"},
    {value: "2deg/E", text: "CIE 2° / E"},
    {value: "10deg/A", text: "CIE 10° / A"},
    {value: "10deg/B", text: "CIE 10° / B"},
    {value: "10deg/C", text: "CIE 10° / C"},
    {value: "10deg/D50", text: "CIE 10° / D50"},
    {value: "10deg/D55", text: "CIE 10° / D55"},
    {value: "10deg/D60", text: "CIE 10° / D60"},
    {value: "10deg/D65", text: "CIE 10° / D65"},
    {value: "10deg/D75", text: "CIE 10° / D75"},
    {value: "10deg/E", text: "CIE 10° / E"},
  ],
  defaultValue: "2deg/D65",
  socketDesc: "desc.socket.illuminant" as StringKey,
};
export const getIlluminant = (socket: InSocket<St.Dropdown>, context: NodeEvalContext) => {
  const illuminantId = socket.inValue(context);
  if (illuminantId !== "custom") {
    const [standard, illuminantName] = illuminantId.split("/"); 
    return cm.illuminantsXy[standard][illuminantName];
  } else {
    throw new Error("not implemented");
  }
};

export namespace spaces {
  enum SpaceMode {
    FromVec = "from vector",
    FromValues = "from values",
  }
  abstract class TripletSpaceNode extends NodeWithOverloads<SpaceMode> {
    static readonly outputDisplayType = OutputDisplayType.Color;

    // TODO these variables are intialized in NodeWithOverload's constructor, so setting them to a default value causes
    // them to be reset in this constructor
    // @ts-ignore
    private illuminantSocket: InSocket<St.Dropdown> | null = this.illuminantSocket ?? null;
    // @ts-ignore
    private colorInputSocket: InSocket<St.VectorOrColor> = this.colorInputSocket ?? null;
    // @ts-ignore
    private valuesSockets: InSocket<St.Float>[] = this.valuesSockets ?? [];

    static readonly overloadGroup = new OverloadGroup(new Map<SpaceMode, Overload<cm.Col, TripletSpaceNode>>([
      [SpaceMode.FromVec, new Overload(
        "From vector",
        node => {
          const sockets: InSocket[] = [];
          if (node.includeWhitePoint) {
            sockets.push(node.illuminantSocket = new InSocket(node, St.Dropdown, "White point", false, whitePointSocketOptions));
          }
          node.colorInputSocket = node.constructInSocket(node.inSocketOptions());
          sockets.push(node.colorInputSocket);

          return sockets;
        },
        node => [
          new OutSocket(node, St.ColorCoords, "Color"),
          ...node.componentLabels.map(label => new OutSocket(node, St.Float, label)),
        ],
        (ins, outs, context, node) => {
          const col = node.computeColor(context, true);
          switch (context.socket) {
            default:
            case outs[0]: return col;
            case outs[1]: return col[0];
            case outs[2]: return col[1];
            case outs[3]: return col[2];
          };
        },
        (ins, outs, context, node) => {
          const outVariables = new Map<NodeOutputTarget, Record<string, string>>([
            [null, {
              "val": "{0:color}.val",
              "illuminant": "{0:color}.illuminant",
              "xyz": "{0:color}.xyz",
            }],

            [outs[0], {
              "val": "{0:color}.val",
              "illuminant": "{0:color}.illuminant",
              "xyz": "{0:color}.xyz",
            }],

            [outs[1], {
              "val": "{0:color}.val.x",
            }],

            [outs[2], {
              "val": "{0:color}.val.y",
            }],

            [outs[3], {
              "val": "{0:color}.val.z",
            }],
          ]);

          if (node.colorInputSocket.effectiveType() === St.ColorCoords) {
            return new WebglVariables(
              `Color {0:color} = Color(${node.webglFromXyz}, {1:newIlluminant}, adaptXyz({xyz}, {originalIlluminant}, {1:newIlluminant}));`,
              outVariables,
              `uniform vec2 {1:newIlluminant};`,
              {
                "{1:newIlluminant}": {
                  set: (gl, unif) => {
                    gl.uniform2fv(unif, node.getIlluminant(context));
                  },
                  dependencySockets: [node.illuminantSocket!],
                },
              },
            ).nameVariableSlots(2);
          } else {
            return new WebglVariables(
              `vec3 {2:val} = {val};
Color {0:color} = Color({2:val}, {1:newIlluminant}, ${node.webglToXyz});`,
              outVariables,
              `uniform vec2 {1:newIlluminant};`,
              {
                "{1:newIlluminant}": {
                  set: (gl, unif) => {
                    gl.uniform2fv(unif, node.getIlluminant(context));
                  },
                  dependencySockets: [node.illuminantSocket!],
                },
              },
            ).nameVariableSlots(3);
          }
        },
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: TripletSpaceNode) => {
          switch (inSocket.effectiveType()) {
            case St.ColorCoords:
              return <WebglSocketValue<T>>{
                "val": "val",
                "illuminant": "originalIlluminant",
                "xyz": "xyz",
              };
            
            case St.Vector:
              return <WebglSocketValue<T>>{
                "val": "val",
              };

            default:
              return null;
          }
        },
      )],

      [SpaceMode.FromValues, new Overload(
        "From values",
        node => {
          const socketOptions = node.inSocketOptions();
          const individualSocketOptions = [0, 1, 2].map(i =>{
            const floatSocketOptions: SocketOptions<St.Float> = {};
            for (const [key, value] of Object.entries(socketOptions)) {
              const newKey = key === "fieldText" ? "socketDesc" : key;

              floatSocketOptions[newKey as keyof typeof socketOptions] = value[i as keyof typeof value];
            }
            return floatSocketOptions;
          });

          const sockets: InSocket[] = [];
          if (node.includeWhitePoint) {
            sockets.push(node.illuminantSocket = new InSocket(node, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions));
          }
          sockets.push(...(node.valuesSockets = node.componentLabels.map((label, i) => new InSocket(node, St.Float, label, true, individualSocketOptions[i]))));
          return sockets;
        },
        node => [
          new OutSocket(node, Socket.Type.ColorCoords, "Color"),
        ],
        (ins, outs, context, node) => node.computeColor(context, false),
        (ins, outs, context, node) => {
          return new WebglVariables(
            `vec3 {2:val} = vec3({x}, {y}, {z});
Color {0:color} = Color({2:val}, {1:newIlluminant}, ${node.webglToXyz});`,
            new Map([
              [null, {
                "val": "{0:color}.val",
                "illuminant": "{0:color}.illuminant",
                "xyz": "{0:color}.xyz",
              }],

              [outs[0], {
                "val": "{0:color}.val",
                "illuminant": "{0:color}.illuminant",
                "xyz": "{0:color}.xyz",
              }],
            ]),
            `uniform vec2 {1:newIlluminant};`,
            {
              "{1:newIlluminant}": {
                set: (gl, unif) => {
                  gl.uniform2fv(unif, node.getIlluminant(context));
                },
                dependencySockets: [node.illuminantSocket!],
              },
            },
          ).nameVariableSlots(3);
        },
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: TripletSpaceNode) => {
          switch (inSocket) {
            case node.valuesSockets[0]: return <WebglSocketValue<T>>{"val": "x"};
            case node.valuesSockets[1]: return <WebglSocketValue<T>>{"val": "y"};
            case node.valuesSockets[2]: return <WebglSocketValue<T>>{"val": "z"};
            default: return null;
          }
        },
      )],
    ]));

    constructor() {
      super(SpaceMode.FromVec);
    }

    // Override functions

    /** The color class to use for conversions */
    get ColClass() {
      return cm.Col;
    }
    get componentLabels() {
      return ["", "", ""];
    }
    constructInSocket(socketOptions: SocketOptions<St.VectorOrColor>) {
      return new InSocket(this, Socket.Type.VectorOrColor, "Vector or color");
    }
    inSocketOptions(): SocketOptions<St.VectorOrColor> {
      return {};
    }
    get includeWhitePoint() {
      return true;
    }
    /** A GLSL expression that takes slots `{2:val}` and `{1:newIlluminant}` of a color and supplies a value for
     * `{0:color}.xyz`, the XYZ coordinates of that color. */
    abstract get webglToXyz(): string;
    /** A GLSL expression that takes slots `{xyz}` and `{originalIlluminant}` of the XYZ coordinates of a color, as
     * well as `{1:newIlluminant}`, and supplies a value for `{0:color}.val`, the current color space's
     * coordinates of that color. */
    abstract get webglFromXyz(): string;

    private getIlluminant(context: NodeEvalContext) {
      return this.includeWhitePoint ? getIlluminant(this.illuminantSocket!, context) : this.ColClass.defaultIlluminant;
    }
    private getColorVector(context: NodeEvalContext, fromVector: boolean) {
      return fromVector
          ? this.colorInputSocket.inValue(context)
          : this.valuesSockets.map(socket => socket.inValue(context)) as Vec3;
    }
    private computeColor(context: NodeEvalContext, fromVector: boolean) {
      // const lchuv = node.memoize(() => {
      // 	const illuminant = getIlluminant(ins[0], context);
      // 	return cm.LchUv.from(ins[1].inValue(context), illuminant);
      // });
      return this.ColClass.from(this.getColorVector(context, fromVector), this.getIlluminant(context));
    }
  }

  abstract class RgbSpaceNode extends TripletSpaceNode {
    get displayLabels() {
      return ["R", "G", "B"];
    }

    get displayFlags() {
      return [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb];
    }

    get componentLabels() {
      return ["R", "G", "B"];
    }
    constructInSocket(socketOptions: SocketOptions<St.VectorOrColor>) {
      return new InSocket(this, Socket.Type.VectorOrColor, "RGB or color", true, socketOptions).flag(SocketFlag.Rgb);
    }
    inSocketOptions(): SocketOptions<St.VectorOrColor> {
      return {
        defaultValue: [0.5, 0.5, 0.5],
        fieldText: [
          "desc.field.rgb.r",
          "desc.field.rgb.g",
          "desc.field.rgb.b",
        ],
      };
    }
    get includeWhitePoint() {
      return false;
    }
  }

  export class LinearNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "linearSrgb";

    get ColClass() {
      return cm.LinearSrgb;
    }
    get webglToXyz() {
      return "linearSrgbToXyz({2:val}, {1:newIlluminant})";
    }
    get webglFromXyz() {
      return "xyzToLinearSrgb({xyz}, {originalIlluminant})";
    }
  }

  export class SrgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "srgb";

    get ColClass() {
      return cm.Srgb;
    }
    get webglToXyz() {
      return "gammaSrgbToXyz({2:val}, {1:newIlluminant})";
    }
    get webglFromXyz() {
      return "xyzToGammaSrgb({xyz}, {originalIlluminant})";
    }
  }

  export class XyzNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "xyz";

    get displayLabels() {
      return ["X", "Y", "Z"];
    }

    get ColClass() {
      return cm.Xyz;
    }
    constructInSocket(socketOptions: SocketOptions<St.VectorOrColor>) {
      return new InSocket(this, Socket.Type.VectorOrColor, "XYZ or color", true, socketOptions);
    }
    inSocketOptions(): SocketOptions<St.VectorOrColor> {
      return {
        fieldText: [
          "desc.field.xyz.x",
          "desc.field.xyz.y",
          "desc.field.xyz.z",
        ],
      };
    }
    get componentLabels() {
      return ["X", "Y", "Z"];
    }
    get webglToXyz() {
      return "{2:val}";
    }
    get webglFromXyz() {
      return "adaptXyz({xyz}, {originalIlluminant}, {1:newIlluminant})";
    }
  }

  const d65 = cm.illuminantsXy["2deg"]["D65"];

  export class XyyNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "xyy";

    get displayLabels() {
      return ["x", "y", "Y"];
    }

    get ColClass() {
      return cm.Xyy;
    }
    constructInSocket(socketOptions: SocketOptions<St.VectorOrColor>) {
      return new InSocket(this, Socket.Type.VectorOrColor, "xyY or color", true, socketOptions);
      // ...(this.primariesSockets = [
      // 	new InSocket(this, Socket.Type.Float, "x (chromaticity 1)", true, {defaultValue: d65[0]}),
      // 	new InSocket(this, Socket.Type.Float, "y (chromaticity 2)", true, {defaultValue: d65[1]}),
      // 	new InSocket(this, Socket.Type.Float, "Y (luminance)", true, {defaultValue: 1}),
      // ]),
    }
    inSocketOptions(): SocketOptions<St.VectorOrColor> {
      return {
        defaultValue: [d65[0], d65[1], 1],
        fieldText: [
          "desc.field.xyy.x",
          "desc.field.xyy.y",
          "desc.field.xyy.lum",
        ],
      };
    }
    get componentLabels() {
      return ["x", "y", "Y"];
    }
    get webglToXyz() {
      return "xyyToXyz({2:val})";
    }
    get webglFromXyz() {
      return "xyzToXyy(adaptXyz({xyz}, {originalIlluminant}, {1:newIlluminant})";
    }
  }

  export class LabNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "lab";

    get displayLabels() {
      return ["L*", "a*", "b*"];
    }

    get ColClass() {
      return cm.Lab;
    }
    constructInSocket(socketOptions: SocketOptions<St.VectorOrColor>) {
      return new InSocket(this, Socket.Type.VectorOrColor, "L*a*b* or color", true, socketOptions);
    }
    inSocketOptions(): SocketOptions<St.VectorOrColor> {
      return {
        defaultValue: [50, 0, 0],
        sliderProps: labSliderProps,
      };
    }
    get componentLabels() {
      return ["L*", "a*", "b*"];
    }
    get webglToXyz() {
      return "labToXyz({2:val}, {1:newIlluminant}, {1:newIlluminant})";
    }
    get webglFromXyz() {
      return "xyzToLab({xyz}, {originalIlluminant}, {1:newIlluminant})";
    }
  }

  export class LchAbNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "lchab";

    get displayLabels() {
      return ["L*", "C*", "h"];
    }

    get ColClass() {
      return cm.LchAb;
    }
    constructInSocket(socketOptions: SocketOptions<St.VectorOrColor>) {
      return new InSocket(this, Socket.Type.VectorOrColor, "L*C*h or color", true, socketOptions);
    }
    inSocketOptions(): SocketOptions<St.VectorOrColor> {
      return {
        defaultValue: [50, 0, 0],
        sliderProps: [
          {
            max: 100,
          },
          {
            hasBounds: false,
            unboundedChangePerPixel: 2,
          },
          {},
        ],
        fieldText: [
          "desc.field.lchab.l",
          "desc.field.lchab.c",
          "desc.field.lchab.h",
        ],
      };
    }
    get componentLabels() {
      return ["L*", "C*", "h"];
    }
    get webglToXyz() {
      return "labToXyz(lchToLxx({2:val}), {1:newIlluminant}, {1:newIlluminant})";
    }
    get webglFromXyz() {
      return "lxxToLch(xyzToLab({xyz}, {originalIlluminant}, {1:newIlluminant}))";
    }
  }

  export class LuvNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "luv";

    get displayLabels() {
      return ["L*", "u*", "v*"];
    }

    get ColClass() {
      return cm.Luv;
    }
    constructInSocket(socketOptions: SocketOptions<St.VectorOrColor>) {
      return new InSocket(this, Socket.Type.VectorOrColor, "L*u*v* or color", true, socketOptions);
    }
    inSocketOptions(): SocketOptions<St.VectorOrColor> {
      return {
        defaultValue: [50, 0, 0],
        sliderProps: labSliderProps,
      };
    }
    get componentLabels() {
      return ["L*", "u*", "v*"];
    }
    get webglToXyz() {
      return "luvToXyz({2:val}, {1:newIlluminant}, {1:newIlluminant})";
    }
    get webglFromXyz() {
      return "xyzToLuv({xyz}, {originalIlluminant}, {1:newIlluminant})";
    }
  }

  export class LchUvNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "lchuv";

    get displayLabels() {
      return ["L*", "C*", "h"];
    }

    get ColClass() {
      return cm.LchUv;
    }
    constructInSocket(socketOptions: SocketOptions<St.VectorOrColor>) {
      return new InSocket(this, Socket.Type.VectorOrColor, "L*C*h or color", true, socketOptions);
    }
    inSocketOptions(): SocketOptions<St.VectorOrColor> {
      return {
        defaultValue: [50, 0, 0],
        sliderProps: [
          {
            max: 100,
          },
          {
            hasBounds: false,
            unboundedChangePerPixel: 2,
          },
          {},
        ],
        fieldText: [
          "desc.field.lchab.l",
          "desc.field.lchab.c",
          "desc.field.lchab.h",
        ],
      };
    }
    get componentLabels() {
      return ["L*", "C*", "h"];
    }
    get webglToXyz() {
      return "luvToXyz(lchToLxx({2:val}), {1:newIlluminant}, {1:newIlluminant})";
    }
    get webglFromXyz() {
      return "lxxToLch(xyzToLuv({xyz}, {originalIlluminant}, {1:newIlluminant}))";
    }
  }

  export class OklabNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "oklab";

    get displayLabels() {
      return ["L", "a", "b"];
    }

    get ColClass() {
      return cm.Oklab;
    }
    constructInSocket(socketOptions: SocketOptions<St.VectorOrColor>) {
      return new InSocket(this, Socket.Type.VectorOrColor, "Lab or color", true, socketOptions);
    }
    inSocketOptions(): SocketOptions<St.VectorOrColor> {
      return {
        defaultValue: [0.5, 0, 0],
        sliderProps: oklabSliderProps,
      };
    }
    get componentLabels() {
      return ["L", "a", "b"];
    }

    get includeWhitePoint() {
      return false;
    }
    get webglToXyz() {
      return "oklabToXyz({2:val}, {1:newIlluminant})";
    }
    get webglFromXyz() {
      return "xyzToOklab({xyz}, {originalIlluminant})";
    }
  }

  export class OklchAbNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "oklchab";

    get displayLabels() {
      return ["L", "C", "h"];
    }

    get ColClass() {
      return cm.OklchAb;
    }
    constructInSocket(socketOptions: SocketOptions<St.VectorOrColor>) {
      return new InSocket(this, Socket.Type.VectorOrColor, "LCh or color", true, socketOptions);
    }
    inSocketOptions(): SocketOptions<St.VectorOrColor> {
      return {
        defaultValue: [0.5, 0, 0],
        sliderProps: [
          {
            max: 1,
          },
          {
            hasBounds: false,
            unboundedChangePerPixel: 0.02,
          },
          {},
        ],
        fieldText: [
          "desc.field.oklchab.l",
          "desc.field.oklchab.c",
          "desc.field.oklchab.h",
        ],
      };
    }
    get componentLabels() {
      return ["L", "C", "h"];
    }

    get includeWhitePoint() {
      return false;
    }
    get webglToXyz() {
      return "oklabToXyz(lchToLxx({2:val}), {1:newIlluminant})";
    }
    get webglFromXyz() {
      return "lxxToLch(xyzToOklab({xyz}, {originalIlluminant}))";
    }
  }

  export class LinearAdobeRgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "linearAdobeRgb";

    get ColClass() {
      return cm.LinearAdobeRgb;
    }
    get webglToXyz() {
      return "linAdobeRgbToXyz({2:val}, {1:newIlluminant})";
    }
    get webglFromXyz() {
      return "xyzToLinAdobeRgb({xyz}, {originalIlluminant})";
    }
  }

  export class AdobeRgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "adobeRgb";

    get ColClass() {
      return cm.AdobeRgb;
    }
    get webglToXyz() {
      return "linAdobeRgbToXyz(gammaToLinAdobeRgb({2:val}), {1:newIlluminant})";
    }
    get webglFromXyz() {
      return "linToGammaAdobeRgb(xyzToLinAdobeRgb({xyz}, {originalIlluminant}))";
    }
  }

  export class Rec709Node extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "rec709";

    get ColClass() {
      return cm.Rec709;
    }
    get webglToXyz() {
      return "linearSrgbToXyz(rec709ToLinearSrgb({2:val}), {1:newIlluminant})";
    }
    get webglFromXyz() {
      return "linearToRec709(xyzToLinearSrgb({xyz}, {originalIlluminant}))";
    }
  }
}