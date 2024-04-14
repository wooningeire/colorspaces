import { Node, Socket, SocketType as St, SocketFlag, NodeEvalContext, OutputDisplayType, InSocket, OutSocket, WebglSocketValue } from "../Node";
import { Overload, OverloadGroup, NodeWithOverloads } from "../Overload";
import * as cm from "../colormanagement";

import { Vec3, pipe } from "@/util";
import { illuminantE } from "../colormanagement/spaces/col-xyz-xyy-illuminants";
import { getIlluminant, whitePointSocketOptions } from "./spaces";
import { WebglVariables } from "@/webgl-compute/WebglVariables";

export namespace models {
  //TODO code duplication
  export class RgbNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "rgb";

    constructor() {
      super();

      this.ins.push(
        new InSocket(this, Socket.Type.Float, "Red").flag(SocketFlag.Rgb),
        new InSocket(this, Socket.Type.Float, "Green").flag(SocketFlag.Rgb),
        new InSocket(this, Socket.Type.Float, "Blue").flag(SocketFlag.Rgb),
      );

      this.outs.push(
        new OutSocket(this, Socket.Type.Vector, "RGB", context => this.ins.map(socket => socket.inValue(context)) as Vec3),
      );
    }

    displayValues(context: NodeEvalContext): Vec3 {
      return this.ins.map(socket => socket.inValue(context)) as Vec3;
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
    static readonly id = "hsl";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload<Vec3 | number>>([
      [RgbMode.ToRgb, new Overload(
        "To RGB",
        node => [
          new InSocket(node, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
          new InSocket(node, Socket.Type.Float, "Saturation"),
          new InSocket(node, Socket.Type.Float, "Lightness"),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Vector, "RGB", context => cm.hslToRgb(ins.map(socket => socket.inValue(context)) as Vec3) as Vec3),
        ],
        (ins, outs, context) => ({
          values: cm.hslToRgb(ins.map(socket => socket.inValue(context)) as Vec3),
          labels: ["R", "G", "B"],
          flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
        }),
        (ins, outs, context) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "hslToRgb({hue}, {saturation}, {lightness})"}],
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
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Hue", context => cm.rgbToHsl(ins[0].inValue(context) as Vec3)[0]).flag(SocketFlag.Hue),
          new OutSocket(node, Socket.Type.Float, "Saturation", context => cm.rgbToHsl(ins[0].inValue(context) as Vec3)[1]),
          new OutSocket(node, Socket.Type.Float, "Lightness", context => cm.rgbToHsl(ins[0].inValue(context) as Vec3)[2]),
        ],
        (ins, outs, context) => ({
          values: cm.rgbToHsl(ins[0].inValue(context) as Vec3),
          labels: ["H", "S", "L"],
          flags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
        }),
        (ins, outs, context) => new WebglVariables(
          "vec3 {0:hsl} = rgbToHsl({rgb});",
          new Map([
            [null, {"val": "{0:hsl}"}],
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
  }

  export class HsvNode extends NodeWithOverloads<RgbMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "hsv";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload<Vec3 | number>>([
      [RgbMode.ToRgb, new Overload(
        "To RGB",
        node => [
          new InSocket(node, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
          new InSocket(node, Socket.Type.Float, "Saturation"),
          new InSocket(node, Socket.Type.Float, "Value"),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Vector, "RGB", context => cm.hsvToRgb(ins.map(socket => socket.inValue(context)) as Vec3)),
        ],
        (ins, outs, context) => ({
          values: cm.hsvToRgb(ins.map(socket => socket.inValue(context)) as Vec3),
          labels: ["R", "G", "B"],
          flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
        }),
        (ins, outs, context) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "hsvToRgb({hue}, {saturation}, {value})"}],
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
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Hue", context => cm.rgbToHsv(ins[0].inValue(context) as Vec3)[0]).flag(SocketFlag.Hue),
          new OutSocket(node, Socket.Type.Float, "Saturation", context => cm.rgbToHsv(ins[0].inValue(context) as Vec3)[1]),
          new OutSocket(node, Socket.Type.Float, "Value", context => cm.rgbToHsv(ins[0].inValue(context) as Vec3)[2]),
        ],
        (ins, outs, context) => ({
          values: cm.rgbToHsv(ins[0].inValue(context) as Vec3),
          labels: ["H", "S", "V"],
          flags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
        }),
        (ins, outs, context) => new WebglVariables(
          "vec3 {0:hsv} = rgbToHsv({rgb});",
          new Map([
            [null, {"val": "{0:hsv}"}],
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
  }

  export class HwbNode extends NodeWithOverloads<RgbMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "hwb";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload<Vec3 | number>>([
      [RgbMode.ToRgb, new Overload(
        "To RGB",
        node => [
          new InSocket(node, Socket.Type.Float, "Hue").flag(SocketFlag.Hue),
          new InSocket(node, Socket.Type.Float, "Whiteness"),
          new InSocket(node, Socket.Type.Float, "Blackness"),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Vector, "RGB", context => cm.hwbToRgb(ins.map(socket => socket.inValue(context)) as Vec3)),
        ],
        (ins, outs, context) => ({
          values: cm.hwbToRgb(ins.map(socket => socket.inValue(context)) as Vec3),
          labels: ["R", "G", "B"],
          flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
        }),
        (ins, outs, context) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "hsvToRgb({hue}, {whiteness}, {blackness})"}],
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
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Hue", context => cm.rgbToHwb(ins[0].inValue(context) as Vec3)[0]).flag(SocketFlag.Hue),
          new OutSocket(node, Socket.Type.Float, "Whiteness", context => cm.rgbToHwb(ins[0].inValue(context) as Vec3)[1]),
          new OutSocket(node, Socket.Type.Float, "Blackness", context => cm.rgbToHwb(ins[0].inValue(context) as Vec3)[2]),
        ],
        (ins, outs, context) => ({
          values: cm.rgbToHwb(ins[0].inValue(context) as Vec3),
          labels: ["H", "W", "B"],
          flags: [SocketFlag.Hue, SocketFlag.None, SocketFlag.None],
        }),
        (ins, outs, context) => new WebglVariables(
          "vec3 {0:hwb} = rgbToHsl({rgb});",
          new Map([
            [null, {"val": "{0:hwb}"}],
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
  }

  export class CmyNode extends NodeWithOverloads<RgbMode> {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "cmy";
    static readonly outputDisplayType = OutputDisplayType.Vec;

    static readonly overloadGroup = new OverloadGroup(new Map<RgbMode, Overload<Vec3 | number>>([
      [RgbMode.ToRgb, new Overload(
        "To RGB",
        node => [
          new InSocket(node, Socket.Type.Float, "Cyan").flag(SocketFlag.Rgb),
          new InSocket(node, Socket.Type.Float, "Magenta").flag(SocketFlag.Rgb),
          new InSocket(node, Socket.Type.Float, "Yellow").flag(SocketFlag.Rgb),
        ],
        (node, ins) => [
          new OutSocket(node, Socket.Type.Vector, "RGB", context => cm.cmyToRgb(ins.map(socket => socket.inValue(context)) as Vec3)),
        ],
        (ins, outs, context) => ({
          values: cm.cmyToRgb(ins.map(socket => socket.inValue(context)) as Vec3),
          labels: ["R", "G", "B"],
          flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
        }),
        (ins, outs, context) => new WebglVariables(
          "",
          new Map([
            [null, {"val": "cmyToRgb({cyan}, {magenta}, {yellow})"}],
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
        (node, ins) => [
          new OutSocket(node, Socket.Type.Float, "Cyan", context => cm.rgbToCmy(ins[0].inValue(context) as Vec3)[0]).flag(SocketFlag.Rgb),
          new OutSocket(node, Socket.Type.Float, "Magenta", context => cm.rgbToCmy(ins[0].inValue(context) as Vec3)[1]).flag(SocketFlag.Rgb),
          new OutSocket(node, Socket.Type.Float, "Yellow", context => cm.rgbToCmy(ins[0].inValue(context) as Vec3)[2]).flag(SocketFlag.Rgb),
        ],
        (ins, outs, context) => ({
          values: cm.rgbToCmy(ins[0].inValue(context) as Vec3),
          labels: ["C", "M", "Y"],
          flags: [SocketFlag.Rgb, SocketFlag.Rgb, SocketFlag.Rgb],
        }),
        (ins, outs, context) => new WebglVariables(
          "vec3 {0:cmy} = rgbToCmy({rgb});",
          new Map([
            [null, {"val": "{0:cmy}"}],
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

  export class SpectralPowerDistributionNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "spectralPowerDistribution";

    distribution: number[] =
      Array(830 - 360 + 1).fill(0)
          .map((_, x) => Math.exp(-(((x - 235) / 90)**2)));

    colorMatchingDataset: "2deg" | "10deg" = "2deg";

    constructor() {
      super();
      
      this.outs.push(
        new OutSocket(this, St.Vector, "XYZ", context => this.computeXyz()),
        new OutSocket(this, St.ColorCoords, "Color", context => new cm.Xyz(this.computeXyz(), illuminantE)),
      );
      this.width = 503;
    }

    private cachedOutput: Vec3 | null = null;
    private computeXyz() {
      return this.cachedOutput
          ?? (this.cachedOutput = [...cm.spectralPowerDistribution(this.distribution, this.colorMatchingDataset)] as any as Vec3);
    }

    flushCache() {
      this.cachedOutput = null;
    }

    webglGetBaseVariables(): WebglVariables {
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
          "{0:unif}": {
            set: (gl, unif) => {
              // we can bake this value from the CPU for now. If sockets are introduced, this must be GPU-computed
              gl.uniform3fv(unif, this.computeXyz());
            },
            dependencySockets: [],
            dependencyNodes: [this],
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
    static readonly id = "wavelength";

    private readonly inSocket: InSocket<St.Float>;
    private readonly powerSocket: InSocket<St.Float>;
    private readonly datasetSocket: InSocket<St.Dropdown>;

    constructor() {
      super();

      this.ins.push(
        (this.inSocket = new InSocket(this, Socket.Type.Float, "Wavelength (nm)", true, {
          sliderProps: {
            softMin: 360,
            softMax: 830,
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
        new OutSocket(this, St.Vector, "XYZ", context => this.computeXyz(context)),
        new OutSocket(this, St.ColorCoords, "Color", context => new cm.Xyz(this.computeXyz(context), illuminantE)),
      );

      this.width = 200;
    }

    private computeXyz(context: NodeEvalContext) {
      return [...cm.singleWavelength(this.inSocket.inValue(context), this.datasetSocket.inValue(context) as "2deg" | "10deg")]
          .map(comp => comp * this.powerSocket.inValue(context)) as Vec3;
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
    static readonly id = "blackbody";

    private readonly inSocket: InSocket<St.Float>;
    private readonly datasetSocket: InSocket<St.Dropdown>;

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
        new OutSocket(this, St.Vector, "XYZ", context => this.computeXyz(context)),
        new OutSocket(this, St.ColorCoords, "Color", context => new cm.Xyz(this.computeXyz(context), illuminantE)),
      );

      this.width = 200;
    }

    private computeXyz(context: NodeEvalContext) {
      return [...cm.blackbody(this.inSocket.inValue(context), this.datasetSocket.inValue(context) as "2deg" | "10deg")] as Vec3;
    }

    webglGetBaseVariables(context: NodeEvalContext={}): WebglVariables {
      const funcName = this.datasetSocket.fieldValue === "2deg"
          ? "blackbodyTemp2ToXyz"
          : "blackbodyTemp10ToXyz";

      return new WebglVariables(
        `vec3 {0:xyz} = ${funcName}({temperature});`,
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
        case this.ins[0]: return <WebglSocketValue<T>>{"val": "temperature"};
        default: return null;
      }
    }
  }

  export class StandardIlluminantNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly id = "standardIlluminant";

    private readonly whitePointSocket: InSocket<St.Dropdown>;

    constructor() {
      super();

      this.ins.push(
        (this.whitePointSocket = new InSocket(this, St.Dropdown, "White point", false, whitePointSocketOptions)),
      );

      this.outs.push(
        new OutSocket(this, St.Vector, "XYZ", context => [...cm.Xyz.from(this.getIlluminant(context))] as Vec3),
        new OutSocket(this, St.Vector, "xyY", context => [...cm.Xyy.from(this.getIlluminant(context))] as Vec3),
        new OutSocket(this, St.ColorCoords, "Color", context => cm.Xyz.from(this.getIlluminant(context))),
      );
    }

    private getIlluminant(context: NodeEvalContext) {
      return getIlluminant(this.whitePointSocket, context);
    }

    webglGetBaseVariables(context: NodeEvalContext={}): WebglVariables {
      return new WebglVariables(
        "",
        new Map([
          [this.outs[0], <Record<string, string>>{"val": "{0:xyz}"}],
          [this.outs[1], <Record<string, string>>{"val": "{1:xyy}"}],
          [this.outs[2], {
            "val": "{0:xyz}",
            "illuminant": "illuminant2_E",
            "xyz": "{0:xyz}",
          }],
        ]),
        `uniform vec3 {0:xyz};
uniform vec3 {1:xyy};`,
        {
          "{0:xyz}": {
            set: (gl, unif) => {
              const illuminant = getIlluminant(this.whitePointSocket, context);
              gl.uniform3fv(unif, cm.Xyz.from(illuminant));
            },
            dependencySockets: [this.whitePointSocket],
            dependencyNodes: [],
          },
          "{1:xyy}": {
            set: (gl, unif) => {
              const illuminant = getIlluminant(this.whitePointSocket, context);
              gl.uniform3fv(unif, cm.Xyy.from(illuminant));
            },
            dependencySockets: [this.whitePointSocket],
            dependencyNodes: [],
          },
        }
      ).nameVariableSlots(2);
    }
    webglGetMapping<T extends St>(inSocket: InSocket<T>): WebglSocketValue<T> | null {
      return null;
    }
  }
}