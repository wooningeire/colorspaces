import { Node, Socket, SocketType as St, SocketFlag, NodeEvalContext, OutputDisplayType, NodeWithOverloads, InSocket, OutSocket, WebglSocketValue } from "../Node";
import { Overload, OverloadGroup } from "../Overload";
import * as cm from "../colormanagement";

import { Color, Vec3, pipe } from "@/util";
import { illuminantE } from "../colormanagement/spaces/col-xyz-xyy-illuminants";
import { getIlluminant, whitePointSocketOptions } from "./spaces";
import { WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace models {
  //TODO code duplication
  export class RgbNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "RGB";
    static readonly DESC = "desc.node.rgb";

    constructor() {
      super();

      this.ins.push(
        new InSocket(this, Socket.Type.Float, "Red").flag(SocketFlag.Rgb),
        new InSocket(this, Socket.Type.Float, "Green").flag(SocketFlag.Rgb),
        new InSocket(this, Socket.Type.Float, "Blue").flag(SocketFlag.Rgb),
      );

      this.outs.push(
        new OutSocket(this, Socket.Type.Vector, "RGB"),
      );
    }

    output(context: NodeEvalContext): Color {
      return this.ins.map(socket => socket.inValue(context)) as Color;
    }

    webglGetBaseVariables(): WebglVariables {
      return new WebglVariables(
        "",
        new Map([
          [this.outs[0], {"val": "vec3({x}, {y}, {z})"}],
        ])
      );
    }
    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      switch (inSocket) {
        case this.ins[0]: return <WebglSocketValue<T>>{"val": "x"};
        case this.ins[1]: return <WebglSocketValue<T>>{"val": "y"};
        case this.ins[2]: return <WebglSocketValue<T>>{"val": "z"};
        default: return null;
      }
    }
  }

  enum RgbMode {
    ToRgb = "to rgb",
    FromRgb = "from rgb",
  }
  export class HslNode extends NodeWithOverloads<RgbMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "HSL";
    static readonly DESC = "desc.node.hsl";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload<Color | number>>([
      [RgbMode.ToRgb, new Overload(
        "To RGB",
        node => [
          new InSocket(node, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
          new InSocket(node, Socket.Type.Float, "Saturation"),
          new InSocket(node, Socket.Type.Float, "Lightness"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Vector, "RGB"),
        ],
        (ins, outs, context) => cm.hslToRgb(ins.map(socket => socket.inValue(context)) as Color) as Color,
        (ins, outs, context) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "hslToRgb({hue}, {saturation}, {lightness})"}],
            [outs[0], {"val": "hslToRgb({hue}, {saturation}, {lightness})"}],
          ]),
        ),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: HslNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "hue"};
            case ins[1]: return <WebglSocketValue<T>>{"val": "saturation"};
            case ins[2]: return <WebglSocketValue<T>>{"val": "lightness"};
            default: return null;
          }
        },
      )],

      [RgbMode.FromRgb, new Overload(
        "From RGB",
        node => [
          new InSocket(node, Socket.Type.Vector, "RGB"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
          new OutSocket(node, Socket.Type.Float, "Saturation"),
          new OutSocket(node, Socket.Type.Float, "Lightness"),
        ],
        (ins, outs, context) => cm.rgbToHsl(ins[0].inValue(context) as Vec3)[outs.indexOf(context.socket!)],
        (ins, outs, context) => new WebglVariables(
          "vec3 {0:hsl} = rgbToHsl({rgb});",
          new Map([
            [undefined, {"val": "{0:hsl}"}],
            [outs[0], {"val": "{0:hsl}.x"}],
            [outs[1], {"val": "{0:hsl}.y"}],
            [outs[2], {"val": "{0:hsl}.z"}],
          ]),
        ).nameVariableSlots(1),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: HslNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "rgb"};
            default: return null;
          }
        },
      )],
    ]));

    constructor() {
      super(RgbMode.ToRgb);
    }

    display(context: NodeEvalContext) {
      switch (this.overloadManager.mode) {
        default:
        case RgbMode.ToRgb:
          return {
            values: this.output(context) as any as Vec3,
            labels: ["R", "G", "B"],
            flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
          };

        case RgbMode.FromRgb:
          return {
            values: [
              this.output({ ...context, socket: this.outs[0] }),
              this.output({ ...context, socket: this.outs[1] }),
              this.output({ ...context, socket: this.outs[2] }),
            ] as Vec3,
            labels: ["H", "S", "L"],
            flags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
          };
      }
    }
  }

  export class HsvNode extends NodeWithOverloads<RgbMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "HSV";
    static readonly DESC = "desc.node.hsv";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload<Color | number>>([
      [RgbMode.ToRgb, new Overload(
        "To RGB",
        node => [
          new InSocket(node, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
          new InSocket(node, Socket.Type.Float, "Saturation"),
          new InSocket(node, Socket.Type.Float, "Value"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Vector, "RGB"),
        ],
        (ins, outs, context) => cm.hsvToRgb(ins.map(socket => socket.inValue(context)) as Color) as Color,
        (ins, outs, context) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "hsvToRgb({hue}, {saturation}, {value})"}],
            [outs[0], {"val": "hsvToRgb({hue}, {saturation}, {value})"}],
          ]),
        ),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: HslNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "hue"};
            case ins[1]: return <WebglSocketValue<T>>{"val": "saturation"};
            case ins[2]: return <WebglSocketValue<T>>{"val": "value"};
            default: return null;
          }
        },
      )],

      [RgbMode.FromRgb, new Overload(
        "From RGB",
        node => [
          new InSocket(node, Socket.Type.Vector, "RGB"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
          new OutSocket(node, Socket.Type.Float, "Saturation"),
          new OutSocket(node, Socket.Type.Float, "Value"),
        ],
        (ins, outs, context) => cm.rgbToHsv(ins[0].inValue(context) as Vec3)[outs.indexOf(context.socket!)],
        (ins, outs, context) => new WebglVariables(
          "vec3 {0:hsv} = rgbToHsv({rgb});",
          new Map([
            [undefined, {"val": "{0:hsv}"}],
            [outs[0], {"val": "{0:hsv}.x"}],
            [outs[1], {"val": "{0:hsv}.y"}],
            [outs[2], {"val": "{0:hsv}.z"}],
          ]),
        ).nameVariableSlots(1),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: HsvNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "rgb"};
            default: return null;
          }
        },
      )],
    ]));

    constructor() {
      super(RgbMode.ToRgb);
    }

    display(context: NodeEvalContext) {
      switch (this.overloadManager.mode) {
        default:
        case RgbMode.ToRgb:
          return {
            values: this.output(context) as any as Vec3,
            labels: ["R", "G", "B"],
            flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
          };

        case RgbMode.FromRgb:
          return {
            values: [
              this.output({ ...context, socket: this.outs[0] }),
              this.output({ ...context, socket: this.outs[1] }),
              this.output({ ...context, socket: this.outs[2] }),
            ] as Vec3,
            labels: ["H", "S", "V"],
            flags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
          };
      }
    }
  }

  export class HwbNode extends NodeWithOverloads<RgbMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "HWB";
    static readonly DESC = "desc.node.hwb";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload<Color | number>>([
      [RgbMode.ToRgb, new Overload(
        "To RGB",
        node => [
          new InSocket(node, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
          new InSocket(node, Socket.Type.Float, "Whiteness"),
          new InSocket(node, Socket.Type.Float, "Blackness"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Vector, "RGB"),
        ],
        (ins, outs, context) => cm.hwbToRgb(ins.map(socket => socket.inValue(context)) as Color) as Color,
        (ins, outs, context) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "hsvToRgb({hue}, {whiteness}, {blackness})"}],
            [outs[0], {"val": "hsvToRgb({hue}, {whiteness}, {blackness})"}],
          ]),
        ),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: HslNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "hue"};
            case ins[1]: return <WebglSocketValue<T>>{"val": "whiteness"};
            case ins[2]: return <WebglSocketValue<T>>{"val": "blackness"};
            default: return null;
          }
        },
      )],

      [RgbMode.FromRgb, new Overload(
        "From RGB",
        node => [
          new InSocket(node, Socket.Type.Vector, "RGB"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
          new OutSocket(node, Socket.Type.Float, "Whiteness"),
          new OutSocket(node, Socket.Type.Float, "Blackness"),
        ],
        (ins, outs, context) => cm.rgbToHwb(ins[0].inValue(context) as Vec3)[outs.indexOf(context.socket!)],
        (ins, outs, context) => new WebglVariables(
          "vec3 {0:hwb} = rgbToHsl({rgb});",
          new Map([
            [undefined, {"val": "{0:hwb}"}],
            [outs[0], {"val": "{0:hwb}.x"}],
            [outs[1], {"val": "{0:hwb}.y"}],
            [outs[2], {"val": "{0:hwb}.z"}],
          ]),
        ).nameVariableSlots(1),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: HwbNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "rgb"};
            default: return null;
          }
        },
      )],
    ]));

    constructor() {
      super(RgbMode.ToRgb);
    }

    display(context: NodeEvalContext) {
      switch (this.overloadManager.mode) {
        default:
        case RgbMode.ToRgb:
          return {
            values: this.output(context) as any as Vec3,
            labels: ["R", "G", "B"],
            flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
          };

        case RgbMode.FromRgb:
          return {
            values: [
              this.output({ ...context, socket: this.outs[0] }),
              this.output({ ...context, socket: this.outs[1] }),
              this.output({ ...context, socket: this.outs[2] }),
            ] as Vec3,
            labels: ["H", "W", "B"],
            flags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
          };
      }
    }
  }

  export class CmyNode extends NodeWithOverloads<RgbMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "CMY";
    static readonly DESC = "desc.node.cmy";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload<Color | number>>([
      [RgbMode.ToRgb, new Overload(
        "To RGB",
        node => [
          new InSocket(node, Socket.Type.Float, "Cyan").flag(SocketFlag.Rgb),
          new InSocket(node, Socket.Type.Float, "Magenta").flag(SocketFlag.Rgb),
          new InSocket(node, Socket.Type.Float, "Yellow").flag(SocketFlag.Rgb),
        ],
        node => [
          new OutSocket(node, Socket.Type.Vector, "RGB"),
        ],
        (ins, outs, context) => cm.cmyToRgb(ins.map(socket => socket.inValue(context)) as Color) as Color,
        (ins, outs, context) => new WebglVariables(
          "",
          new Map([
            [undefined, {"val": "cmyToRgb({cyan}, {magenta}, {yellow})"}],
            [outs[0], {"val": "cmyToRgb({cyan}, {magenta}, {yellow})"}],
          ]),
        ),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: HslNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "cyan"};
            case ins[1]: return <WebglSocketValue<T>>{"val": "magenta"};
            case ins[2]: return <WebglSocketValue<T>>{"val": "yellow"};
            default: return null;
          }
        },
      )],

      [RgbMode.FromRgb, new Overload(
        "From RGB",
        node => [
          new InSocket(node, Socket.Type.Vector, "RGB"),
        ],
        node => [
          new OutSocket(node, Socket.Type.Float, "Cyan").flag(SocketFlag.Rgb),
          new OutSocket(node, Socket.Type.Float, "Magenta").flag(SocketFlag.Rgb),
          new OutSocket(node, Socket.Type.Float, "Yellow").flag(SocketFlag.Rgb),
        ],
        (ins, outs, context) => cm.rgbToCmy(ins[0].inValue(context) as Vec3)[outs.indexOf(context.socket!)],
        (ins, outs, context) => new WebglVariables(
          "vec3 {0:cmy} = rgbToCmy({rgb});",
          new Map([
            [undefined, {"val": "{0:cmy}"}],
            [outs[0], {"val": "{0:cmy}.x"}],
            [outs[1], {"val": "{0:cmy}.y"}],
            [outs[2], {"val": "{0:cmy}.z"}],
          ]),
        ).nameVariableSlots(1),
        <T extends St>(inSocket: InSocket<T>, ins: InSocket[], node: CmyNode) => {
          switch (inSocket) {
            case ins[0]: return <WebglSocketValue<T>>{"val": "rgb"};
            default: return null;
          }
        },
      )],
    ]));

    constructor() {
      super(RgbMode.ToRgb);
    }

    display(context: NodeEvalContext) {
      switch (this.overloadManager.mode) {
        default:
        case RgbMode.ToRgb:
          return {
            values: this.output(context) as any as Vec3,
            labels: ["R", "G", "B"],
            flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
          };

        case RgbMode.FromRgb:
          return {
            values: [
              this.output({ ...context, socket: this.outs[0] }),
              this.output({ ...context, socket: this.outs[1] }),
              this.output({ ...context, socket: this.outs[2] }),
            ] as Vec3,
            labels: ["C", "M", "Y"],
            flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
          };
      }
    }
  }

  /* export class XyzModelNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "XYZ (model)";

    constructor() {
      super();

      this.ins.push(
        new InSocket(this, Socket.Type.Float, "X"),
        new InSocket(this, Socket.Type.Float, "Y"),
        new InSocket(this, Socket.Type.Float, "Z"),
      );

      this.outs.push(
        new OutSocket(this, Socket.Type.Vector, "XYZ"),
      );
    }

    output(context: NodeEvalContext): Color {
      return this.ins.map(socket => socket.inValue(context)) as Color;
    }
  } */

  export class VectorNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Vector";
    static readonly DESC = "desc.node.vector";

    constructor() {
      super();

      this.ins.push(
        new InSocket(this, Socket.Type.Float, "", true, {
          sliderProps: {
            hasBounds: false,
          },
        }),
        new InSocket(this, Socket.Type.Float, "", true, {
          sliderProps: {
            hasBounds: false,
          },
        }),
        new InSocket(this, Socket.Type.Float, "", true, {
          sliderProps: {
            hasBounds: false,
          },
        }),
      );

      this.outs.push(
        new OutSocket(this, Socket.Type.Vector, "Vector"),
      );
    }

    output(context: NodeEvalContext): Color {
      return this.ins.map(socket => socket.inValue(context)) as Color;
    }

    webglGetBaseVariables(): WebglVariables {
      return new WebglVariables(
        "",
        new Map([
          [this.outs[0], {"val": "vec3({x}, {y}, {z})"}],
        ])
      );
    }
    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      switch (inSocket) {
        case this.ins[0]: return <WebglSocketValue<T>>{"val": "x"};
        case this.ins[1]: return <WebglSocketValue<T>>{"val": "y"};
        case this.ins[2]: return <WebglSocketValue<T>>{"val": "z"};
        default: return null;
      }
    }
  }

  export class SpectralPowerDistributionNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Spectral power distribution";
    static readonly DESC = "desc.node.spectralPowerDistribution";

    distribution: number[] =
      Array(830 - 360 + 1).fill(0)
          .map((_, x) => Math.exp(-(((x - 235) / 90)**2)));
    ;

    colorMatchingDataset: "2deg" | "10deg" = "2deg";

    constructor() {
      super();
      
      this.outs.push(
        new OutSocket(this, St.Vector, "XYZ"),
        new OutSocket(this, St.ColorCoords, "Color"),
      );
      this.width = 503;
    }

    private cachedOutput: Vec3 | null = null;

    output(context: NodeEvalContext): Vec3 | cm.Xyz {
      const xyz = this.cachedOutput
          ?? (this.cachedOutput = [...cm.spectralPowerDistribution(this.distribution, this.colorMatchingDataset)] as any as Vec3);

      switch (context.socket) {
        default:
        case this.outs[0]:
          return xyz;

        case this.outs[1]:
          return new cm.Xyz(xyz, illuminantE);
      }
    }

    flushCache() {
      this.cachedOutput = null;
    }

    webglGetBaseVariables(): WebglVariables {
      const xyz = this.cachedOutput
          ?? (this.cachedOutput = [...cm.spectralPowerDistribution(this.distribution, this.colorMatchingDataset)] as any as Vec3);

      return new WebglVariables(
        "",
        new Map([
          [this.outs[0], <Record<string, string>>{"val": "{0:unif}"}],
          [this.outs[1], {
            "val": "{0:unif}",
            "illuminant": "illuminant2_E",
            "xyz": "{0:unif}",
          }],
        ]),
        "uniform vec3 {0:unif};",
        {
          "{0:unif}": (gl, unif) => {
            gl.uniform3fv(unif, xyz);
          },
        },
      ).nameVariableSlots(1);
    }
    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      return null;
    }
  }

  export class WavelengthNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Wavelength";
    static readonly DESC = "desc.node.wavelength";

    private readonly inSocket: Socket<St.Float>;
    private readonly powerSocket: Socket<St.Float>;
    private readonly datasetSocket: Socket<St.Dropdown>;

    constructor() {
      super();

      this.ins.push(
        (this.inSocket = new InSocket(this, Socket.Type.Float, "Wavelength (nm)", true, {
          sliderProps: {
            min: 360,
            max: 830,
            step: 1,
          },
          defaultValue: 510,
        })),
        (this.powerSocket = new InSocket(this, Socket.Type.Float, "Relative power", true, {
          sliderProps: {
            hasBounds: false,
          },
          defaultValue: 1,
        })),
        (this.datasetSocket = new InSocket(this, Socket.Type.Dropdown, "Dataset", false, {
          defaultValue: "2deg",
          options: [
            {value: "2deg", text: "CIE 2° observer (1931)"},
            {value: "10deg", text: "CIE 10° observer (1964)"},
          ],
          valueChangeRequiresShaderReload: true,
        })),
      );
      
      this.outs.push(
        new OutSocket(this, St.Vector, "XYZ"),
        new OutSocket(this, St.ColorCoords, "Color"),
      );

      this.width = 200;
    }

    output(context: NodeEvalContext): Vec3 | cm.Xyz {
      const xyz = [...cm.singleWavelength(this.inSocket.inValue(context), this.datasetSocket.inValue(context) as "2deg" | "10deg")]
          .map(comp => comp * this.powerSocket.inValue(context)) as any as Vec3;

      switch (context.socket) {
        default:
        case this.outs[0]:
          return xyz;

        case this.outs[1]:
          return new cm.Xyz(xyz, illuminantE);
      }
    }

    webglGetBaseVariables(): WebglVariables {
      const arrayName = this.datasetSocket.fieldValue === "2deg"
          ? "cmf2"
          : "cmf10";

      return new WebglVariables(
        `vec3 {0:xyz} = ${arrayName}[int(round({wavelength})) - 360] * {power};`,
        new Map([
          [this.outs[0], <Record<string, string>>{"val": "{0:xyz}"}],
          [this.outs[1], {
            "val": "{0:xyz}",
            "illuminant": "illuminant2_E",
            "xyz": "{0:xyz}",
          }],
        ]),
      ).nameVariableSlots(1);
    }
    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      switch (inSocket) {
        case this.ins[0]: return <WebglSocketValue<T>>{"val": "wavelength"};
        case this.ins[1]: return <WebglSocketValue<T>>{"val": "power"};
        default: return null;
      }
    }
  }

  export class BlackbodyNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Blackbody";
    static readonly DESC = "desc.node.blackbody";

    private readonly inSocket: Socket<St.Float>;
    private readonly datasetSocket: Socket<St.Dropdown>;

    constructor() {
      super();

      this.ins.push(
        (this.inSocket = new InSocket(this, Socket.Type.Float, "Temperature (K)", true, {
          sliderProps: {
            hasBounds: false,
            unboundedChangePerPixel: 10,
          },
          defaultValue: 1750,
        })),
        (this.datasetSocket = new InSocket(this, Socket.Type.Dropdown, "Dataset", false, {
          defaultValue: "2deg",
          options: [
            {value: "2deg", text: "CIE 2° observer (1931)"},
            {value: "10deg", text: "CIE 10° observer (1964)"},
          ],
        })),
      );
      
      this.outs.push(
        new OutSocket(this, St.Vector, "XYZ"),
        new OutSocket(this, St.ColorCoords, "Color"),
      );

      this.width = 200;
    }

    output(context: NodeEvalContext): Vec3 | cm.Xyz {
      const xyz = [...cm.blackbody(this.inSocket.inValue(context), this.datasetSocket.inValue(context) as "2deg" | "10deg")] as unknown as Vec3;

      switch (context.socket) {
        default:
        case this.outs[0]:
          return xyz;

        case this.outs[1]:
          return new cm.Xyz(xyz, illuminantE);
      }
    }
  }

  export class StandardIlluminantNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Standard illuminant";
    static readonly DESC = "desc.node.standardIlluminant";

    private readonly whitePointSocket: Socket<St.Dropdown>;

    private readonly outXyzSocket: Socket<St.Vector>;
    private readonly outXyySocket: Socket<St.Vector>;

    constructor() {
      super();

      this.ins.push(
        (this.whitePointSocket = new InSocket(this, St.Dropdown, "White point", false, whitePointSocketOptions)),
      );

      this.outs.push(
        (this.outXyzSocket = new OutSocket(this, St.Vector, "XYZ")),
        (this.outXyySocket = new OutSocket(this, St.Vector, "xyY")),
        new OutSocket(this, St.ColorCoords, "Color")
      );
    }

    output(context: NodeEvalContext): number[] | cm.Xyz {
      const illuminant = getIlluminant(this.whitePointSocket, context);

      switch(context.socket) {
        case this.outXyzSocket:
          return [...cm.Xyz.from(illuminant)];

        case this.outXyySocket:
          return [...cm.Xyy.from(illuminant)];

        default:
        case this.outs[2]:
          return cm.Xyz.from(illuminant);
      }
    }
  }
}