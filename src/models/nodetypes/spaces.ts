import { Vec3 } from "@/util";
import { SocketFlag, NodeEvalContext, OutputDisplayType, SocketOptions, InSocket, OutSocket, webglStdOuts, SocketType, InSocketOptions } from "../Node";
import { Overload, OverloadGroup, NodeWithOverloads } from "../Overload";
import * as cm from "../colormanagement";
import { StringKey } from "@/strings";
import { WebglSlot, WebglTemplate, WebglVariables } from "@/webgl-compute/WebglVariables";
import { vectorOrColorInSocketMapping } from "./util";



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

export const whitePointSocketOptions = <SocketOptions<SocketType.Dropdown>>{
  options: [
    {value: "2deg/A", text: "label.standardIlluminant.2deg.a"},
    {value: "2deg/B", text: "label.standardIlluminant.2deg.b"},
    {value: "2deg/C", text: "label.standardIlluminant.2deg.c"},
    {value: "2deg/D50", text: "label.standardIlluminant.2deg.d50"},
    {value: "2deg/D55", text: "label.standardIlluminant.2deg.d55"},
    {value: "2deg/D60", text: "label.standardIlluminant.2deg.d60"},
    {value: "2deg/D65", text: "label.standardIlluminant.2deg.d65"},
    {value: "2deg/D75", text: "label.standardIlluminant.2deg.d75"},
    {value: "2deg/E", text: "label.standardIlluminant.2deg.e"},
    {value: "10deg/A", text: "label.standardIlluminant.10deg.a"},
    {value: "10deg/B", text: "label.standardIlluminant.10deg.b"},
    {value: "10deg/C", text: "label.standardIlluminant.10deg.c"},
    {value: "10deg/D50", text: "label.standardIlluminant.10deg.d50"},
    {value: "10deg/D55", text: "label.standardIlluminant.10deg.d55"},
    {value: "10deg/D60", text: "label.standardIlluminant.10deg.d60"},
    {value: "10deg/D65", text: "label.standardIlluminant.10deg.d65"},
    {value: "10deg/D75", text: "label.standardIlluminant.10deg.d75"},
    {value: "10deg/E", text: "label.standardIlluminant.10deg.e"},
  ],
  showSocket: false,
  defaultValue: "2deg/D65",
  socketDesc: "desc.socket.illuminant" as StringKey,
};
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

    private static readonly inputSlots = WebglSlot.ins("inVec", "inColor", "x", "y", "z");
    private static readonly outputSlots = WebglSlot.outs("outColor", "newIlluminant", "outComponents");

    static readonly overloadGroup = new OverloadGroup(new Map<SpaceOverloadMode, Overload<TripletSpaceNode>>([
      [SpaceOverloadMode.FromVec, (() => {
        const {inVec, inColor} = this.inputSlots;
        const {outColor, newIlluminant} = this.outputSlots;

        return new Overload(
          "label.overload.fromVector",
          node => {
            const sockets: InSocket[] = [];
            if (node.includeWhitePoint) {
              sockets.push(node.illuminantSocket = new InSocket(node, SocketType.Dropdown, "label.socket.illuminant", whitePointSocketOptions));
            }
  
            node.colorInputSocket = node.constructInSocket({
              webglGetOutputMapping: vectorOrColorInSocketMapping({colorSlot: inColor, vectorSlot: inVec}),
              ...node.inSocketOptions(),
            });
            sockets.push(node.colorInputSocket);
  
            return sockets;
          },
          node => [
            new OutSocket(node, SocketType.ColorComponents, "label.socket.color", context => node.computeColor(context, true), {
              webglOutputs: socket => () => ({[webglStdOuts.color]: WebglTemplate.slot(outColor)}),
            }),
            ...node.componentLabels.map(
              (label, i) =>
                  new OutSocket(node, SocketType.Float, label, context => node.computeColor(context, true)[i], {
                    webglOutputs: socket => () => ({
                      [webglStdOuts.float]: WebglTemplate.concat`${outColor}.components.${["x", "y", "z"][i]}`,
                    }),
                  })
            ),
          ],
          (ins, outs, context, node) => ({
            values: node.computeColor(context, true),
            labels: node.displayLabels,
            flags: node.displayFlags,
          }),
          (ins, outs, context, node) => {
            if (node.colorInputSocket.effectiveType() === SocketType.ColorComponents) {
              return WebglVariables.templateConcat`Color ${outColor} = Color(${node.webglXyzToComponents(inColor, newIlluminant)}, ${newIlluminant}, adaptXyz(${inColor}.xyz, ${inColor}.illuminant, ${newIlluminant}));`({
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
              return WebglVariables.templateConcat`Color ${outColor} = Color(${inVec}, ${newIlluminant}, ${node.webglComponentsToXyz(inVec, newIlluminant)});`({
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
          () => ({[webglStdOuts.color]: WebglTemplate.slot(outColor)}),
        )
      })()],

      [SpaceOverloadMode.FromValues, (() => {
        const {x, y, z} = this.inputSlots;
        const {outColor, newIlluminant, outComponents} = this.outputSlots;

        return new Overload(
          "label.overload.fromValues",
          node => {
            const slots = [x, y, z];
  
            const socketOptions = node.inSocketOptions();
            const individualSocketOptions = new Array(3).fill(0).map((_, i) =>{
              const floatSocketOptions: InSocketOptions<SocketType.Float> = {
                webglOutputMapping: {[webglStdOuts.float]: slots[i]}
              };
              for (const [key, value] of Object.entries(socketOptions)) {
                const newKey = key === "fieldText" ? "socketDesc" : key;
  
                floatSocketOptions[newKey as keyof typeof socketOptions] = value[i as keyof typeof value];
              }
              return floatSocketOptions;
            });
  
            const sockets: InSocket[] = [];
            if (node.includeWhitePoint) {
              sockets.push(node.illuminantSocket = new InSocket(node, SocketType.Dropdown, "label.socket.illuminant", whitePointSocketOptions));
            }
            sockets.push(...(node.valuesSockets = node.componentLabels.map((label, i) => new InSocket(node, SocketType.Float, label, individualSocketOptions[i]))));
            return sockets;
          },
          node => [
            new OutSocket(node, SocketType.ColorComponents, "label.socket.color", context => node.computeColor(context, false), {
              webglOutputs: socket => () => ({[webglStdOuts.color]: WebglTemplate.slot(outColor)}),
            }),
          ],
          (ins, outs, context, node) => ({
            values: node.computeColor(context, false),
            labels: node.displayLabels,
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
          () => ({[webglStdOuts.color]: WebglTemplate.slot(outColor)}),
        )
      })()],
    ]));

    constructor() {
      super(SpaceOverloadMode.FromVec);
    }

    // Override functions

    /** The color class to use for conversions */
    abstract get ColClass(): typeof cm.Col;
    abstract get componentLabels(): StringKey[];

    get displayLabels(): StringKey[] {
      return this.componentLabels;
    }

    get displayFlags(): SocketFlag[] {
      return [];
    }

    constructInSocket(socketOptions: InSocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "label.socket.vectorOrColor");
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
    get displayFlags() {
      return [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb];
    }

    get componentLabels(): StringKey[] {
      return ["label.rgb.r", "label.rgb.g", "label.rgb.b"];
    }
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "label.socket.rgbOrColor", socketOptions).flag(SocketFlag.Rgb);
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

    get ColClass() {
      return cm.Xyz;
    }
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "label.socket.xyzOrColor", socketOptions);
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
    get componentLabels(): StringKey[] {
      return ["label.xyz.x", "label.xyz.y", "label.xyz.z"];
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

    get ColClass() {
      return cm.Xyy;
    }
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "label.socket.xyyOrColor", socketOptions);
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
    get componentLabels(): StringKey[] {
      return ["label.xyy.x", "label.xyy.y", "label.xyz.y"];
    }
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToXyy(adaptXyz(${inColor}.xyz, ${inColor}.illuminant, ${newIlluminant}))`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyyToXyz(${outComponents})`;
    }
  }

  export class CielabNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "cielab";

    get ColClass() {
      return cm.Cielab;
    }
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "label.socket.lxyOrColor", socketOptions);
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
      return {
        defaultValue: [50, 0, 0],
        sliderProps: labSliderProps,
      };
    }
    get componentLabels(): StringKey[] {
      return ["label.cielxy.l", "label.cielab.a", "label.cielab.b"];
    }
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToCielab(${inColor}.xyz, ${inColor}.illuminant, ${newIlluminant})`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`cielabToXyz(${outComponents}, ${newIlluminant}, ${newIlluminant})`;
    }
  }

  export class CieluvNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "cieluv";

    get ColClass() {
      return cm.Cieluv;
    }
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "label.socket.lxyOrColor", socketOptions);
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
      return {
        defaultValue: [50, 0, 0],
        sliderProps: labSliderProps,
      };
    }
    get componentLabels(): StringKey[] {
      return ["label.cielxy.l", "label.cieluv.u", "label.cieluv.v"];
    }
    webglXyzToComponents(inColor: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`xyzToCieluv(${inColor}.xyz, ${inColor}.illuminant, ${newIlluminant})`;
    }
    webglComponentsToXyz(outComponents: WebglSlot, newIlluminant: WebglSlot) {
      return WebglTemplate.source`cieluvToXyz(${outComponents}, ${newIlluminant}, ${newIlluminant})`;
    }
  }

  export class OklabNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "oklab";

    get ColClass() {
      return cm.Oklab;
    }
    constructInSocket(socketOptions: SocketOptions<SocketType.VectorOrColor>) {
      return new InSocket(this, SocketType.VectorOrColor, "label.socket.lxyOrColor", socketOptions);
    }
    inSocketOptions(): SocketOptions<SocketType.VectorOrColor> {
      return {
        defaultValue: [0.5, 0, 0],
        sliderProps: oklabSliderProps,
      };
    }
    get componentLabels(): StringKey[] {
      return ["label.lxy.l", "label.lab.a", "label.lab.b"];
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