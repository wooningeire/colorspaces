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

    private static readonly inputSlots = WebglSlot.ins("inVal", "x", "y", "z");
    private static readonly outputSlots = WebglSlot.outs("outColor", "newIlluminant", "outComponents");

    static readonly overloadGroup = new OverloadGroup(new Map<SpaceOverloadMode, Overload<TripletSpaceNode>>([
      [SpaceOverloadMode.FromVec, (() => {
        const {inVal} = this.inputSlots;
        const {outColor, newIlluminant} = this.outputSlots;

        return new Overload(
          "From vector",
          node => {
            const sockets: InSocket[] = [];
            if (node.includeWhitePoint) {
              sockets.push(node.illuminantSocket = new InSocket(node, SocketType.Dropdown, "White point", whitePointSocketOptions));
            }
  
            const {inVal} = this.inputSlots;
            node.colorInputSocket = node.constructInSocket({
              webglGetOutputMapping: socket => () => ({[webglOuts.val]: inVal}),
              ...node.inSocketOptions(),
            });
            sockets.push(node.colorInputSocket);
  
            return sockets;
          },
          node => [
            new OutSocket(node, SocketType.ColorComponents, "Color", context => node.computeColor(context, true), {
              webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.slot(outColor)}),
            }),
            ...node.componentLabels.map(
              (label, i) =>
                  new OutSocket(node, SocketType.Float, label, context => node.computeColor(context, true)[i], {
                    webglOutputs: socket => () => ({
                      [webglOuts.val]: WebglTemplate.concat`${outColor}.components.${["x", "y", "z"][i]}`,
                    }),
                  })
            ),
          ],
          (ins, outs, context, node) => ({
            values: node.computeColor(context, true),
            labels: node.componentLabels,
            flags: node.displayFlags,
          }),
          (ins, outs, context, node) => {
            if (node.colorInputSocket.effectiveType() === SocketType.ColorComponents) {
              return WebglVariables.templateConcat`Color ${outColor} = Color(${node.webglXyzToComponents(inVal, newIlluminant)}, ${newIlluminant}, adaptXyz(${inVal}.xyz, ${inVal}.illuminant, ${newIlluminant}));`({
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
              return WebglVariables.templateConcat`Color ${outColor} = Color(${inVal}, ${newIlluminant}, ${node.webglComponentsToXyz(inVal, newIlluminant)});`({
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
          () => ({[webglOuts.val]: WebglTemplate.slot(outColor)}),
        )
      })()],

      [SpaceOverloadMode.FromValues, (() => {
        const {x, y, z} = this.inputSlots;
        const {outColor, newIlluminant, outComponents} = this.outputSlots;

        return new Overload(
          "From values",
          node => {
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
          node => [
            new OutSocket(node, SocketType.ColorComponents, "Color", context => node.computeColor(context, false), {
              webglOutputs: socket => () => ({[webglOuts.val]: WebglTemplate.slot(outColor)}),
            }),
          ],
          (ins, outs, context, node) => ({
            values: node.computeColor(context, false),
            labels: node.componentLabels,
            flags: node.displayFlags,
          }),
          (ins, outs, context, node) => WebglVariables.templateConcat`vec3 ${outComponents} = vec3(${x}, ${y}, ${z});
Color ${outColor} = Color(${outComponents}, ${newIlluminant}, ${node.webglComponentsToXyz(outComponents, newIlluminant)});`({
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
          }),
          () => ({[webglOuts.val]: WebglTemplate.slot(outColor)}),
        )
      })()],
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
    /** A GLSL expression that takes slots `inColor`, as well as `newIlluminant`, and supplies a value for
     * `${outColor}.components`, the current color space's coordinates of that color. */
    abstract webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot): WebglTemplate;
    /** A GLSL expression that takes slots `outComponents` and `newIlluminant`, and supplies a value for
     * `${outColor}.xyz`, the XYZ coordinates of that color. */
    abstract webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot): WebglTemplate;

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
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToLinearSrgb(${inColor}.xyz, ${inColor}.illuminant)`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`linearSrgbToXyz(${outComponents}, ${newIlluminant})`;
    }
  }

  export class SrgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "srgb";

    get ColClass() {
      return cm.Srgb;
    }
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToGammaSrgb(${inColor}.xyz, ${inColor}.illuminant)`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`gammaSrgbToXyz(${outComponents}, ${newIlluminant})`;
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
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`adaptXyz(${inColor}.xyz, ${inColor}.illuminant, ${newIlluminant})`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.slot(outComponents);
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
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToXyy(adaptXyz(${inColor}.xyz, ${inColor}.illuminant, ${newIlluminant}))`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyyToXyz(${outComponents})`;
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
      return new InSocket(this, SocketType.VectorOrColor, "Lxy or color", socketOptions);
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
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToLab(${inColor}.xyz, ${inColor}.illuminant, ${newIlluminant})`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`labToXyz(${outComponents}, ${newIlluminant}, ${newIlluminant})`;
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
      return new InSocket(this, SocketType.VectorOrColor, "Lxy or color", socketOptions);
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
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToLuv(${inColor}.xyz, ${inColor}.illuminant, ${newIlluminant})`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`luvToXyz(${outComponents}, ${newIlluminant}, ${newIlluminant})`;
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
      return new InSocket(this, SocketType.VectorOrColor, "Lxy or color", socketOptions);
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
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToOklab(${inColor}.xyz, ${inColor}.illuminant)`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`oklabToXyz(${outComponents}, ${newIlluminant})`;
    }
  }

  export class LinearAdobeRgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "linearAdobeRgb";

    get ColClass() {
      return cm.LinearAdobeRgb;
    }
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToLinAdobeRgb(${inColor}.xyz, ${inColor}.illuminant)`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`linAdobeRgbToXyz(${outComponents}, ${newIlluminant})`;
    }
  }

  export class AdobeRgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "adobeRgb";

    get ColClass() {
      return cm.AdobeRgb;
    }
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`linToGammaAdobeRgb(xyzToLinAdobeRgb(${inColor}.xyz, ${inColor}.illuminant))`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`linAdobeRgbToXyz(gammaToLinAdobeRgb(${outComponents}), ${newIlluminant})`;
    }
  }

  export class Rec709Node extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "rec709";

    get ColClass() {
      return cm.Rec709;
    }
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`linearToRec709(xyzToLinearSrgb(${inColor}.xyz, ${inColor}.illuminant))`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`linearSrgbToXyz(rec709ToLinearSrgb(${outComponents}), ${newIlluminant})`;
    }
  }
}