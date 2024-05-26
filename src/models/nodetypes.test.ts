import { describe, expect, test } from "vitest";
import { images, math, spaces } from "./nodetypes";
import { Socket } from "./Node";
import { WebglVariables } from "@/webgl-compute/WebglVariables";

describe(images.SampleNode.name, () => {
  const gradientNode = new images.GradientNode();
  const sampleNode = new images.SampleNode();
  const vectorNode = new math.VectorNode();
  const srgbNode = new spaces.SrgbNode();

  Socket.linkSockets(gradientNode.outs[0], sampleNode.ins[0]);
  Socket.linkSockets(sampleNode.outs[0], vectorNode.ins[1]);
  Socket.linkSockets(vectorNode.outs[0], srgbNode.ins[1]);

  sampleNode.ins[1].fieldValue = 0.812;


  test("output is correct", () => {
    const output = srgbNode.display({coords: [0, 0]});
    expect(output.values[0]).toBeCloseTo(0);
    expect(output.values[1]).toBeCloseTo(0.812);
    expect(output.values[2]).toBeCloseTo(0);
  });

  test("WebGL output is correct", () => {
    const transpilation = WebglVariables.transpileNodeOutput(srgbNode);
  });
});