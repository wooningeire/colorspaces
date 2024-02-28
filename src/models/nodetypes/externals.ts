import {Tree, Node, Socket, SocketType as St, Link, NodeEvalContext, OutputDisplayType, SocketFlag, InSocket, OutSocket} from "../Node";
import * as cm from "../colormanagement";

import {Color, Vec2, Vec3, pipe} from "@/util";

export namespace externals {
  export class DeviceTransformNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Display buffer";

    readonly colorSockets: Socket<St.VectorOrColor>[];
    
    constructor() {
      super();
      
      this.ins.push(
        ...(this.colorSockets = [
          new InSocket(this, Socket.Type.VectorOrColor, "Color"),
        ]),
      );

      this.outs.push(
        new OutSocket(this, Socket.Type.Unknown, "Color data", context => {}),
      );

      this.canMove = false;
    }

    output(context: NodeEvalContext): cm.Srgb {
      const color = (context.socket! as Socket<St.VectorOrColor>).inValue(context);

      return color && cm.Srgb.from(color);
      // return this.colorSockets.filter(socket => socket.hasLinks)
      //     .map(socket => cm.Srgb.from(socket.inValueFn(context)));
    }

    // pipeOutput() {
    //   const node = this.colorSockets[0].node as models.RgbNode;

    //   return pipe(node.pipeOutput(), cm.Srgb.from);
    // }

    onSocketLink(socket: Socket, link: Link, tree: Tree) {
      super.onSocketLink(socket, link, tree);

      if (!socket.isInput) return;

      const newSocket = new InSocket(this, Socket.Type.VectorOrColor, "Color");

      this.ins.push(newSocket);
      this.colorSockets.push(newSocket);
    }

    onSocketUnlink(socket: Socket, link: Link, tree: Tree): void {
      super.onSocketUnlink(socket, link, tree);

      if (!socket.isInput) return;

      this.ins.splice(this.ins.indexOf(socket), 1);
      this.colorSockets.splice(this.colorSockets.indexOf(socket), 1);
    }
  }

  export class DevicePostprocessingNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Device postprocessing";
    
    constructor() {
      super();

      this.ins.push(
        new InSocket(this, Socket.Type.Unknown, "Color data"),
      );

      this.outs.push(
        new OutSocket(this, Socket.Type.Unknown, "Screen image", context => {}),
      );

      this.canMove = false;
      this.canEditLinks = false;
    }
  }

  export class EnvironmentNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Environmental conditions";
    
    constructor() {
      super();

      this.ins.push(
        new InSocket(this, Socket.Type.Unknown, "Radiation"),
      );

      this.outs.push(
        new OutSocket(this, Socket.Type.Unknown, "Radiation"),
      );

      this.canMove = false;
      this.canEditLinks = false;
    }
  }

  export class VisionNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Human vision";
    
    constructor() {
      super();

      this.ins.push(
        new InSocket(this, Socket.Type.Unknown, "Light"),
      );

      this.canMove = false;
      this.canEditLinks = false;
    }
  }
}