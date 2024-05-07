import { describe, expect, it } from "vitest";
import { InSocket, Node, OutSocket, SocketType, Tree } from "./Node";

class ConstantNode extends Node {
  constructor() {
    super();

    this.ins.push(
      new InSocket(this, SocketType.Float),
    );

    this.outs.push(
      new OutSocket(this, SocketType.Float, "", () => 1),
    )
  }
}

describe(Node.name, () => {
  describe(Node.prototype.findCyclicalLinks.name, () => {
    it("detects cyclical links", () => {
      const tree = new Tree();
  
      const a = new ConstantNode();
      const b = new ConstantNode();
  
      tree.nodes.add(a);
      tree.nodes.add(b);
  
      tree.linkSockets(a.outs[0], b.ins[0]);

      {
        const {duplicateLinks, allVisitedLinks} = a.findCyclicalLinks();
        expect(duplicateLinks.size).toBe(0);
      }

      tree.linkSockets(b.outs[0], a.ins[0]);
  
      {
        const {duplicateLinks, allVisitedLinks} = a.findCyclicalLinks();
        expect(duplicateLinks.size).toBe(2);
      }
    });
  });
});