import {Tree, Node, Socket, SocketType as St, Link, NodeEvalContext, OutputDisplayType, SocketFlag} from "../Node";
import * as cm from "../colormanagement";

import {Color, Vec2, Vec3, pipe} from "@/util";

export namespace output {
    export class CssOutputNode extends Node {
        static readonly TYPE = Symbol(this.name);
        static readonly LABEL = "CSS output";
        static readonly DESC = "desc.node.cssOutput";

        static readonly outputDisplayType = OutputDisplayType.Css;

        constructor() {
            super();

            this.ins.push(
                new Socket(this, true, Socket.Type.Vector, "RGB").flag(SocketFlag.Rgb),
            );

            this.width = 250;
        }

        output(context: NodeEvalContext) {
            return this.ins[0].inValue(context);
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