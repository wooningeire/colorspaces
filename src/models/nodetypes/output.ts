import { WebglVariables } from "@/webgl-compute/WebglVariables";
import {Tree, Node, Socket, SocketType as St, Link, NodeEvalContext, OutputDisplayType, SocketFlag, InSocket, WebglSocketValue} from "../Node";
import { Overload, OverloadGroup, NodeWithOverloads } from "../Overload";
import * as cm from "../colormanagement";

import {Color, Vec2, Vec3, pipe} from "@/util";


export enum ChromaticityPlotMode {
  Color = "from color",
  Xy = "from xy",
}
export namespace output {
  enum CssOutputMode {
    RgbVector = "rgbVector",
    Color = "color",
  }
  export class CssOutputNode extends NodeWithOverloads<CssOutputMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "cssOutput";
    static readonly outputDisplayType = OutputDisplayType.Css;

    static readonly overloadGroup = new OverloadGroup(new Map<CssOutputMode, Overload<void>>([
      [CssOutputMode.RgbVector, new Overload(
        "RGB vector",
        node => [
          new InSocket(node, Socket.Type.Vector, "RGB").flag(SocketFlag.Rgb),
        ],
        node => [],
        (ins, outs, context) => ({
          values: ins[0].inValue(context),
          labels: [],
          flags: [],
        }),
      )],
      [CssOutputMode.Color, new Overload(
        "Color",
        node => [
          new InSocket(node, Socket.Type.ColorCoords, "Color"),
        ],
        node => [],
        (ins, outs, context) => ({
          values: ins[0].inValue(context),
          labels: [],
          flags: [],
        }),
      )],
    ]));

    constructor() {
      super(CssOutputMode.RgbVector);
      this.width = 275;
    }
  }
  export class ChromaticityPlotNode extends NodeWithOverloads<ChromaticityPlotMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "chromaticityPlot";

    static readonly overloadGroup = new OverloadGroup(new Map<ChromaticityPlotMode, Overload<void>>([
      [ChromaticityPlotMode.Color, new Overload(
        "From colors",
        node => [
          new InSocket(node, Socket.Type.ColorCoords, "Colors"),
        ],
        node => [],
      )],

      [ChromaticityPlotMode.Xy, new Overload(
        "From xy",
        node => [
          new InSocket(node, Socket.Type.Float, "x", true, {
            defaultValue: cm.illuminantsXy["2deg"]["D65"][0],
          }),
          new InSocket(node, Socket.Type.Float, "y", true, {
            defaultValue: cm.illuminantsXy["2deg"]["D65"][1],
          }),
        ],
        node => [],
      )],
    ]));

    constructor() {
      super(ChromaticityPlotMode.Color);
      this.width = 200;
    }
  }

  export class ImagePlotNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "imagePlot";
    static readonly outputDisplayType = OutputDisplayType.Custom;

    readonly normalizeCoordsSocket: InSocket<St.Bool>;
    readonly alphaSocket: InSocket<St.Float>;
    readonly widthSocket: InSocket<St.Float>;
    readonly heightSocket: InSocket<St.Float>;

    width = 240;

    constructor() {
      super();
      this.ins.push(
        (this.normalizeCoordsSocket = new InSocket(this, St.Bool, "Normalize coordinates", false, {
          defaultValue: true,
        })),
        new InSocket(this, St.ColorCoords, "Colors"),
        (this.alphaSocket = new InSocket(this, St.Float, "Alpha", true, {
          defaultValue: 1,
        })),
        (this.widthSocket = new InSocket(this, St.Float, "Width", true, {
          defaultValue: 42,
          sliderProps: {
            hasBounds: false,
          },
        })),
        (this.heightSocket = new InSocket(this, St.Float, "Height", true, {
          defaultValue: 42,
          sliderProps: {
            hasBounds: false,
          },
        })),
      );
    }

    display(context: NodeEvalContext) {
      return {
        values: this.ins[1].inValue(context),
        labels: [],
        flags: [],
      };
    }

    webglGetBaseVariables(context?: NodeEvalContext): WebglVariables {
      return new WebglVariables(
        ``,
        new Map([
          [null, {
            "xyz": "{xyz}",
            "illuminant": "{illuminant}",
            "val": "{val}",
            "alpha": "{alpha}",
          }],
        ])
      ).nameVariableSlots(1);
    }

    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      switch (inSocket) {
        case this.ins[1]: return <WebglSocketValue<T>>{
          "xyz": "xyz",
          "illuminant": "illuminant",
          "val": "val",
        }; 
        case this.ins[2]: return <WebglSocketValue<T>>{
          "val": "alpha",
        };
        case this.ins[3]: return <WebglSocketValue<T>>{}; 
        case this.ins[4]: return <WebglSocketValue<T>>{}; 
        default: return null;
      }
    }
  }

  export class SampleHexCodesNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "sampleHexCodes";
    static readonly outputDisplayType = OutputDisplayType.Custom;

    readonly colorsSocket: InSocket<St.ColorCoords>;

    width = 600;

    constructor() {
      super();
      this.ins.push(
        (this.colorsSocket = new InSocket(this, St.ColorCoords, "Colors")),
      );
    }
  }
}