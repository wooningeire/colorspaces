import { Vec3 } from "@/util";
import { SocketFlag, NodeEvalContext, OutputDisplayType, SocketOptions, InSocket, OutSocket, WebglSocketOutputMapping, webglOuts, SocketType, InSocketOptions } from "../Node";
import { Overload, OverloadGroup, NodeWithOverloads } from "../Overload";
import * as cm from "../colormanagement";
import { StringKey } from "@/strings";
import { WebglOutputs, WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";



export const labSliderProps = [
  {
    softMax: 100,
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
    softMax: 1,
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
  showSocket: false,
  defaultValue: "2deg/D65",
  socketDesc: "desc.socket.illuminant" as StringKey,
} as SocketOptions<SocketType.Dropdown>;
export const getIlluminant = (socket: InSocket<SocketType.Dropdown>, context: NodeEvalContext) => {
  const illuminantId = socket.inValue(context);
  if (illuminantId !== "custom") {
    const [standard, illuminantName] = illuminantId.split("/"); 
    return cm.illuminantsXy[standard][illuminantName];
  } else {
    throw new Error("not implemented");
  }
};

export namespace spaces {
  enum SpaceOverloadMode {
    FromVec = "from vector",
    FromValues = "from values",
  }
  abstract class TripletSpaceNode extends NodeWithOverloads<SpaceOverloadMode> {
    static readonly outputDisplayType = OutputDisplayType.Color;

    // TODO these variables are intialized in NodeWithOverload's constructor, so setting them to a default value causes
    // them to be reset in this constructor
    // @ts-ignore
    private illuminantSocket: InSocket<SocketType.Dropdown> | null = this.illuminantSocket ?? null;
    // @ts-ignore
    private colorInputSocket: InSocket<SocketType.VectorOrColor> = this.colorInputSocket ?? null;
    // @ts-ignore
    private valuesSockets: InSocket<SocketType.Float>[] = this.valuesSockets ?? [];

    
    private static readonly inputSlots = WebglSlot.ins("xyz", "originalIlluminant", "val", "x", "y", "z");
    private static readonly outputSlots = WebglSlot.outs("color", "newIlluminant", "outVal");

    static readonly overloadGroup = new OverloadGroup(new Map<SpaceOverloadMode, Overload<TripletSpaceNode>>([
      [SpaceOverloadMode.FromVec, new Overload(
        "From vector",
        node => {
          const sockets: InSocket[] = [];
          if (node.includeWhitePoint) {
            sockets.push(node.illuminantSocket = new InSocket(node, SocketType.Dropdown, "White point", whitePointSocketOptions));
          }

          const {val, originalIlluminant, xyz} = TripletSpaceNode.inputSlots;
          node.colorInputSocket = node.constructInSocket({
            webglGetOutputMapping: socket => () => {
              switch (socket.effectiveType()) {
                case SocketType.ColorCoords:
                  return {
                    [webglOuts.val]: val,
                    [webglOuts.illuminant]: originalIlluminant,
                    [webglOuts.xyz]: xyz,
                  };
                
                case SocketType.Vector:
                  return {
                    [webglOuts.val]: val,
                  };
    
                default:
                  return null;
              }
            },
            ...node.inSocketOptions(),
          });
          sockets.push(node.colorInputSocket);

          return sockets;
        },
        node => {
          const {color} = TripletSpaceNode.outputSlots;
          
          return [
            new OutSocket(node, SocketType.ColorCoords, "Color", context => node.computeColor(context, true), {
              webglOutputs: socket => () => ({
                [webglOuts.val]: WebglTemplate.source`${color}.val`,
                [webglOuts.illuminant]: WebglTemplate.source`${color}.illuminant`,
                [webglOuts.xyz]: WebglTemplate.source`${color}.xyz`,
              }),
            }),
            ...node.componentLabels.map(
              (label, i) =>
                  new OutSocket(node, SocketType.Float, label, context => node.computeColor(context, true)[i], {
                    webglOutputs: socket => () => ({
                      [webglOuts.val]: WebglTemplate.concat`${color}.val.${["x", "y", "z"][i]}`,
                    })
                  })
            ),
          ];
        },
        (ins, outs, context, node) => ({
          values: node.computeColor(context, true),
          labels: node.componentLabels,
          flags: node.displayFlags,
        }),
        (ins, outs, context, node) => {
          const {color, newIlluminant, outVal} = TripletSpaceNode.outputSlots;

          if (node.colorInputSocket.effectiveType() === SocketType.ColorCoords) {
            const {xyz, originalIlluminant} = TripletSpaceNode.inputSlots;

            return WebglVariables.templateConcat`Color ${color} = Color(${node.webglFromXyz(xyz, originalIlluminant, newIlluminant)}, ${newIlluminant}, adaptXyz(${xyz}, ${originalIlluminant}, ${newIlluminant}));`({
              node,
              preludeTemplate: WebglTemplate.source`uniform vec2 ${newIlluminant};`,
              uniforms: new Map([
                [WebglTemplate.slot(newIlluminant), {
                  set: (gl, unif) => {
                    gl.uniform2fv(unif, node.getIlluminant(context));
                  },
                  dependencySockets: [node.illuminantSocket!],
                  dependencyNodes: [],
                }],
              ]),
            });
          } else {            
            const {val} = TripletSpaceNode.inputSlots;

            return WebglVariables.templateConcat`vec3 ${outVal} = ${val};
Color ${color} = Color(${outVal}, ${newIlluminant}, ${node.webglToXyz(newIlluminant, outVal)});`({
              node,
              preludeTemplate: WebglTemplate.source`uniform vec2 ${newIlluminant};`,
              uniforms: new Map([
                [WebglTemplate.slot(newIlluminant), {
                  set: (gl, unif) => {
                    gl.uniform2fv(unif, node.getIlluminant(context));
                  },
                  dependencySockets: [node.illuminantSocket!],
                  dependencyNodes: [],
                }],
              ]),
            });
          }
        },
        () => {
          const {color} = TripletSpaceNode.outputSlots;

          return {
            [webglOuts.val]: WebglTemplate.source`${color}.val`,
            [webglOuts.illuminant]: WebglTemplate.source`${color}.illuminant`,
            [webglOuts.xyz]: WebglTemplate.source`${color}.xyz`,
          };
        }
      )],

      [SpaceOverloadMode.FromValues, new Overload(
        "From values",
        node => {
          const {x, y, z} = this.inputSlots;
          const slots = [x, y, z];

          const socketOptions = node.inSocketOptions();
          const individualSocketOptions = new Array(3).fill(0).map((_, i) =>{
            const floatSocketOptions: InSocketOptions<SocketType.Float> = {
              webglOutputMapping: {[webglOuts.val]: slots[i]}
            };
            for (const [key, value] of Object.entries(socketOptions)) {
              const newKey = key === "fieldText" ? "socketDesc" : key;

              floatSocketOptions[newKey as keyof typeof socketOptions] = value[i as keyof typeof value];
            }
            return floatSocketOptions;
          });

          const sockets: InSocket[] = [];
          if (node.includeWhitePoint) {
            sockets.push(node.illuminantSocket = new InSocket(node, SocketType.Dropdown, "White point", whitePointSocketOptions));
          }
          sockets.push(...(node.valuesSockets = node.componentLabels.map((label, i) => new InSocket(node, SocketType.Float, label, individualSocketOptions[i]))));
          return sockets;
        },
        node => {
          const {color} = TripletSpaceNode.outputSlots;

          return [
            new OutSocket(node, SocketType.ColorCoords, "Color", context => node.computeColor(context, false), {
              webglOutputs: socket => () => ({
                [webglOuts.val]: WebglTemplate.source`${color}.val`,
                [webglOuts.illuminant]: WebglTemplate.source`${color}.illuminant`,
                [webglOuts.xyz]: WebglTemplate.source`${color}.xyz`,
              })
            }),
          ];
        },
        (ins, outs, context, node) => ({
          values: node.computeColor(context, false),
          labels: node.componentLabels,
          flags: node.displayFlags,
        }),
        (ins, outs, context, node) => {
          const {x, y, z} = TripletSpaceNode.inputSlots;
          const {color, newIlluminant, outVal} = TripletSpaceNode.outputSlots;

          return WebglVariables.templateConcat`vec3 ${outVal} = vec3(${x}, ${y}, ${z});
Color ${color} = Color(${outVal}, ${newIlluminant}, ${node.webglToXyz(newIlluminant, outVal)});`({
            node,
            preludeTemplate: WebglTemplate.source`uniform vec2 ${newIlluminant};`,
            uniforms: new Map([
              [WebglTemplate.slot(newIlluminant), {
                set: (gl, unif) => {
                  gl.uniform2fv(unif, node.getIlluminant(context));
                },
                dependencySockets: [node.illuminantSocket!],
                dependencyNodes: [],
              }],
            ])
          });
        },
        () => {
          const {color} = TripletSpaceNode.outputSlots;

          return {
            [webglOuts.val]: WebglTemplate.source`${color}.val`,
            [webglOuts.illuminant]: WebglTemplate.source`${color}.illuminant`,
            [webglOuts.xyz]: WebglTemplate.source`${color}.xyz`,
          };
        }
      )],
    ]));

    constructor() {
      super(SpaceOverloadMode.FromVec);
    }

    // Override functions

    /** The color class to use for conversions */
    abstract get ColClass(): typeof cm.Col;
    abstract get componentLabels(): string[];
    
    get displayFlags(): SocketFlag[] {
      return [];
    }

    constructInSocket(socketOptions: InSocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "Vector or color");
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
      return {};
    }
    get includeWhitePoint() {
      return true;
    }
    /** A GLSL expression that takes slots `{2:val}` and `{1:newIlluminant}` of a color and supplies a value for
     * `{0:color}.xyz`, the XYZ coordinates of that color. */
    abstract webglToXyz(newIlluminant: WebglSlot, val: WebglSlot): WebglTemplate;
    /** A GLSL expression that takes slots `{xyz}` and `{originalIlluminant}` of the XYZ coordinates of a color, as
     * well as `{1:newIlluminant}`, and supplies a value for `{0:color}.val`, the current color space's
     * coordinates of that color. */
    abstract webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot): WebglTemplate;

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
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "RGB or color", socketOptions).flag(SocketFlag.Rgb);
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
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

  export class LinearSrgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "linearSrgb";

    get ColClass() {
      return cm.LinearSrgb;
    }
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.source`linearSrgbToXyz(${val}, ${newIlluminant})`;
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToLinearSrgb(${xyz}, ${originalIlluminant})`;
    }
  }

  export class SrgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "srgb";

    get ColClass() {
      return cm.Srgb;
    }
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.source`gammaSrgbToXyz(${val}, ${newIlluminant})`;
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToGammaSrgb(${xyz}, ${originalIlluminant})`;
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
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "XYZ or color", socketOptions);
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
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
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.slot(val);
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`adaptXyz(${xyz}, ${originalIlluminant}, ${newIlluminant})`;
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
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "xyY or color", socketOptions);
      // ...(this.primariesSockets = [
      // 	new InSocket(this, SocketType.Float, "x (chromaticity 1)", true, {defaultValue: d65[0]}),
      // 	new InSocket(this, SocketType.Float, "y (chromaticity 2)", true, {defaultValue: d65[1]}),
      // 	new InSocket(this, SocketType.Float, "Y (luminance)", true, {defaultValue: 1}),
      // ]),
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
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
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.source`xyyToXyz(${val})`;
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToXyy(adaptXyz(${xyz}, ${originalIlluminant}, ${newIlluminant}))`;
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
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "L*a*b* or color", socketOptions);
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
      return {
        defaultValue: [50, 0, 0],
        sliderProps: labSliderProps,
      };
    }
    get componentLabels() {
      return ["L*", "a*", "b*"];
    }
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.source`labToXyz(${val}, ${newIlluminant}, ${newIlluminant})`;
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToLab(${xyz}, ${originalIlluminant}, ${newIlluminant})`;
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
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "L*C*h or color", socketOptions);
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
      return {
        defaultValue: [50, 0, 0],
        sliderProps: [
          {
            softMax: 100,
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
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.source`labToXyz(lchToLxx(${val}), ${newIlluminant}, ${newIlluminant})`;
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`lxxToLch(xyzToLab(${xyz}, ${originalIlluminant}, ${newIlluminant}))`;
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
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "L*u*v* or color", socketOptions);
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
      return {
        defaultValue: [50, 0, 0],
        sliderProps: labSliderProps,
      };
    }
    get componentLabels() {
      return ["L*", "u*", "v*"];
    }
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.source`luvToXyz(${val}, ${newIlluminant}, ${newIlluminant})`;
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToLuv(${xyz}, ${originalIlluminant}, ${newIlluminant})`;
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
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "L*C*h or color", socketOptions);
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
      return {
        defaultValue: [50, 0, 0],
        sliderProps: [
          {
            softMax: 100,
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
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.source`luvToXyz(lchToLxx(${val}), ${newIlluminant}, ${newIlluminant})`;
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`lxxToLch(xyzToLuv(${xyz}, ${originalIlluminant}, ${newIlluminant}))`;
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
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "Lab or color", socketOptions);
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
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
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.source`oklabToXyz(${val}, ${newIlluminant})`;
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToOklab(${xyz}, ${originalIlluminant})`;
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
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "LCh or color", socketOptions);
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
      return {
        defaultValue: [0.5, 0, 0],
        sliderProps: [
          {
            softMax: 1,
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
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.source`oklabToXyz(lchToLxx(${val}), ${newIlluminant})`;
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`lxxToLch(xyzToOklab(${xyz}, ${originalIlluminant}))`;
    }
  }

  export class LinearAdobeRgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "linearAdobeRgb";

    get ColClass() {
      return cm.LinearAdobeRgb;
    }
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.source`linAdobeRgbToXyz(${val}, ${newIlluminant})`;
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToLinAdobeRgb(${xyz}, ${originalIlluminant})`;
    }
  }

  export class AdobeRgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "adobeRgb";

    get ColClass() {
      return cm.AdobeRgb;
    }
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.source`linAdobeRgbToXyz(gammaToLinAdobeRgb(${val}), ${newIlluminant})`;
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`linToGammaAdobeRgb(xyzToLinAdobeRgb(${xyz}, ${originalIlluminant}))`;
    }
  }

  export class Rec709Node extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "rec709";

    get ColClass() {
      return cm.Rec709;
    }
    webglToXyz(newIlluminant: WebglSlot, val: WebglSlot) {
      return WebglTemplate.source`linearSrgbToXyz(rec709ToLinearSrgb(${val}), ${newIlluminant})`;
    }
    webglFromXyz(xyz: WebglSlot, originalIlluminant: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`linearToRec709(xyzToLinearSrgb(${xyz}, ${originalIlluminant}))`;
    }
  }
}