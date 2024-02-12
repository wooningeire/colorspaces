import {Tree, Node, Socket, SocketType as St, Link, NodeEvalContext, OutputDisplayType, SocketFlag, NodeWithOverloads} from "../Node";
import { Overload, OverloadGroup } from "../Overload";
import * as cm from "../colormanagement";

import {Color, Vec2, Vec3, pipe} from "@/util";

export namespace output {
    enum CssOutputMode {
        RgbVector = "rgbVector",
        Color = "color",
    }
    export class CssOutputNode extends NodeWithOverloads<CssOutputMode> {
        static readonly TYPE = Symbol(this.name);
        static readonly LABEL = "CSS output";
        static readonly DESC = "desc.node.cssOutput";
        static readonly outputDisplayType = OutputDisplayType.Css;

        static readonly overloadGroup = new OverloadGroup(new Map<CssOutputMode, Overload<void>>([
            [CssOutputMode.RgbVector, new Overload(
                "RGB vector",
				node => [
                    new Socket(node, true, Socket.Type.Vector, "RGB").flag(SocketFlag.Rgb),
                ],
				node => [],
				(ins, outs, context) => ins[0].inValue(context),
            )],
            [CssOutputMode.Color, new Overload(
                "Color",
				node => [
                    new Socket(node, true, Socket.Type.ColorCoords, "Color"),
                ],
				node => [],
				(ins, outs, context) => ins[0].inValue(context),
            )],
        ]));

        constructor() {
            super(CssOutputMode.RgbVector);
            this.width = 275;
        }
    }

    export class ChromaticityPlotNode extends Node {
        static readonly TYPE = Symbol(this.name);
        static readonly LABEL = "Chromaticity plot";
        static readonly DESC = "desc.node.chromaticity";

        constructor() {
            super();

            this.ins.push(
                new Socket(this, true, Socket.Type.Float, "x", true, {
                    defaultValue: cm.illuminantsXy["2deg"]["D65"][0],
                }),
                new Socket(this, true, Socket.Type.Float, "y", true, {
                    defaultValue: cm.illuminantsXy["2deg"]["D65"][1],
                }),
            );
        }
    }
}