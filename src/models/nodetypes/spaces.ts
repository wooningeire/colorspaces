import { Vec3 } from "@/util";
import {Node, Socket, SocketType as St, SocketFlag, NodeEvalContext, OutputDisplayType, NodeWithOverloads, SliderProps, SocketOptions, InSocket, OutSocket} from "../Node";
import { Overload, OverloadGroup } from "../Overload";
import * as cm from "../colormanagement";
import {StringKey} from "@/strings";


abstract class SpaceNode extends Node { 
  static readonly outputDisplayType: OutputDisplayType = OutputDisplayType.Color;
}

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
    unboundedChangePerPixel: 0.25,
  },
  {
    hasBounds: false,
    unboundedChangePerPixel: 0.25,
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
export const getIlluminant = (socket: Socket<St.Dropdown>, context: NodeEvalContext) => {
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

    static readonly overloadGroup = new OverloadGroup(new Map<SpaceMode, Overload<cm.Col, TripletSpaceNode>>([
      [SpaceMode.FromVec, new Overload(
        "From vector",
        node => {
          const sockets: Socket[] = [];
          if (node.includeWhitePoint) {
            sockets.push(new InSocket(node, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions));
          }
          sockets.push(node.constructInSocket(node.inSocketOptions()));
          return sockets;
        },
        node => [
          new OutSocket(node, Socket.Type.ColorCoords, "Color"),
          ...node.componentLabels.map(label => new OutSocket(node, St.Float, label)),
        ],
        (ins, outs, context, node) => {
          const col = node.computeColor(ins, context, true);
          switch (context.socket) {
            default:
            case outs[0]: return col;
            case outs[1]: return col[0];
            case outs[2]: return col[1];
            case outs[3]: return col[2];
          };
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

          const sockets: Socket[] = [];
          if (node.includeWhitePoint) {
            sockets.push(new InSocket(node, Socket.Type.Dropdown, "White point", false, whitePointSocketOptions));
          }
          sockets.push(...node.componentLabels.map((label, i) => new InSocket(node, St.Float, label, true, individualSocketOptions[i])));
          return sockets;
        },
        node => [
          new OutSocket(node, Socket.Type.ColorCoords, "Color"),
        ],
        (ins, outs, context, node) => node.computeColor(ins, context, false),
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

    private getIlluminant(ins: Socket[], context: NodeEvalContext) {
      return this.includeWhitePoint ? getIlluminant(ins[0], context) : this.ColClass.defaultIlluminant;
    }
    private getColorVector(ins: Socket[], context: NodeEvalContext, fromVector: boolean) {
      return fromVector
          ? (this.includeWhitePoint ? ins[1] as Socket<St.VectorOrColor> : ins[0] as Socket<St.VectorOrColor>).inValue(context)
          : (this.includeWhitePoint ? [1, 2, 3] : [0, 1, 2]).map(index => ins[index].inValue(context)) as Vec3;
    }
    private computeColor(ins: Socket[], context: NodeEvalContext, fromVector: boolean) {
      // const lchuv = node.memoize(() => {
      // 	const illuminant = getIlluminant(ins[0], context);
      // 	return cm.LchUv.from(ins[1].inValue(context), illuminant);
      // });
      return this.ColClass.from(this.getColorVector(ins, context, fromVector), this.getIlluminant(ins, context));
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
    static readonly LABEL = "Linear sRGB";
    static readonly DESC = "desc.node.linearSrgb";

    get ColClass() {
      return cm.LinearSrgb;
    }
  }

  export class SrgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "sRGB";
    static readonly DESC = "desc.node.srgb";

    get ColClass() {
      return cm.Srgb;
    }
  }

  export class XyzNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "XYZ";
    static readonly DESC = "desc.node.xyz";

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
  }

  const d65 = cm.illuminantsXy["2deg"]["D65"];

  export class XyyNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "xyY";

    static readonly DESC = "desc.node.xyy";

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
  }

  export class LabNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "L\\*a\\*b\\*";
    static readonly DESC = "desc.node.lab";

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
  }

  export class LchAbNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "L\\*C\\*h<sub>ab</sub>";
    static readonly DESC = "desc.node.lchab";

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
  }

  export class LuvNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "L\\*u\\*v\\*";
    static readonly DESC = "desc.node.luv";

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
  }

  export class LchUvNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "L\\*C\\*h<sub>uv</sub>";
    static readonly DESC = "desc.node.lchuv";

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
  }


  export class OklabNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Oklab";
    static readonly DESC = "desc.node.oklab";

    get displayLabels() {
      return ["L", "a", "b"];
    }

    get ColClass() {
      return cm.Oklab;
    }
    constructInSocket(socketOptions: SocketOptions<St.VectorOrColor>) {
      return new InSocket(this, Socket.Type.VectorOrColor, "Lab* or color", true, socketOptions);
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
  }

  export class OklchAbNode extends TripletSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Oklch";
    static readonly DESC = "desc.node.oklchab";

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
  }

  export class LinearAdobeRgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Linear Adobe RGB 1998";

    get ColClass() {
      return cm.LinearAdobeRgb;
    }
  }

  export class AdobeRgbNode extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Adobe RGB 1998";

    get ColClass() {
      return cm.AdobeRgb;
    }
  }

  export class Rec709Node extends RgbSpaceNode {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Rec. 709";
    static readonly DESC = "desc.node.rec709";

    get ColClass() {
      return cm.Rec709;
    }
  }
}