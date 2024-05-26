import { describe, expect, it } from "vitest";
import { InSocket, Node, OutSocket, Socket, SocketType } from "./Node";
import { NO_DESC } from "@/strings";

class ConstantNode extends Node {
  constructor() {
    super();

    this.ins.push(
      new InSocket(this, SocketType.Float, NO_DESC),
    );

    this.outs.push(
      new OutSocket(this, SocketType.Float, NO_DESC, () => 1),
    )
  }
}

describe(Node.name, () => {
  describe(Node.prototype.findCyclicalLinks.name, () => {
    it("detects cyclical links", () => {  
      const a = new ConstantNode();
      const b = new ConstantNode();
  
      Socket.linkSockets(a.outs[0], b.ins[0]);

      {
        const {duplicateLinks, allVisitedLinks} = a.findCyclicalLinks();
        expect(duplicateLinks.size).toBe(0);
      }

      Socket.linkSockets(b.outs[0], a.ins[0]);
  
      {
        const {duplicateLinks, allVisitedLinks} = a.findCyclicalLinks();
        expect(duplicateLinks.size).toBe(2);
      }
    });
  });

  describe(Node.prototype.toposortedDependencies.name, () => {
    it("obtains all dependencies correctly", () => {

      const a = new ConstantNode();
      const b = new ConstantNode();
      const c = new ConstantNode();
  
      Socket.linkSockets(a.outs[0], b.ins[0]);
      Socket.linkSockets(b.outs[0], c.ins[0]);

      expect([...c.toposortedDependencies()]).toEqual([a, b, c]);
    });
  });
});