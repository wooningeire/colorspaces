import {Tree, Node, Socket, SocketType, Link, NodeEvalContext, OutputDisplayType, SocketFlag, InSocket, OutSocket} from "$/node";
import * as cm from "$/color-management";

export namespace externals {
  export class DeviceTransformNode extends Node {
    static readonly TYPE = Symbol(this.name);
    static readonly LABEL = "Display buffer";

    readonly colorSockets: Socket<SocketType.VectorOrColor>[];
    
    constructor() {
      super();
      
      this.ins.push(
        ...(this.colorSockets = [
          new InSocket(this, SocketType.VectorOrColor, "Color"),
        ]),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Unknown, "Color data", context => {}),
      );

      this.canMove = false;
    }

    output(context: NodeEvalContext): cm.Srgb {
      const color = (context.socket! as Socket<SocketType.VectorOrColor>).inValue(context);

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

      const newSocket = new InSocket(this, SocketType.VectorOrColor, "Color");

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
        new InSocket(this, SocketType.Unknown, "Color data"),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Unknown, "Screen image", context => {}),
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
        new InSocket(this, SocketType.Unknown, "Radiation"),
      );

      this.outs.push(
        new OutSocket(this, SocketType.Unknown, "Radiation"),
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
        new InSocket(this, SocketType.Unknown, "Light"),
      );

      this.canMove = false;
      this.canEditLinks = false;
    }
  }
}