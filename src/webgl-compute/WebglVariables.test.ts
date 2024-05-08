import { describe, expect, it } from "vitest";
import { WebglSlot, WebglTemplate, WebglVariables } from "./WebglVariables";
import { Node, NodeOutputTarget } from "@/models/Node";

class WebglConstantNode extends Node {
  webglGetBaseVariables(): WebglVariables {
    const output = WebglSlot.out("output");

    return WebglVariables.template`vec3 ${output} = vec3(1., 1., 1.);`({
      nodeOutVariables: {
        [webglOuts.val]: WebglTemplate.slot(output),
        [webglOuts.illuminant]: WebglTemplate.string("illuminant2_E"),
        [webglOuts.xyz]: WebglTemplate.source`linearSrgbToXyz(${output})`,
      },
    });
  }
}

describe(WebglTemplate.name, () => {
  describe(WebglTemplate.prototype.substitute.name, () => {
    it("fills slots properly", () => {
      const input = WebglSlot.in("input");
  
      const template = WebglTemplate.source`float vector = ${input} + 1.;`;
      const filledTemplate = template.substitute(new Map([
        [input, "6.28"],
      ]));
  
      expect(filledTemplate.toString()).toBe("float vector = 6.28 + 1.;");
    });
  });

  describe(WebglTemplate.merge.name, () => {
    it("merges properly", () => {
      const x = WebglSlot.in("x");
      const scalar = WebglSlot.in("scalar");

      const template = WebglTemplate.merge(
        WebglTemplate.source`vec2 v = vec2(${x}, 3.);`,
        WebglTemplate.string("vec2 w = v + 1.;"),
        WebglTemplate.source`vec2 u = w * ${scalar};`,
      );

      const filledTemplate = template.substitute(new Map([
        [x, "5."],
        [scalar, "2."],
      ]));

      expect(filledTemplate.toString()).toBe("vec2 v = vec2(5., 3.);vec2 w = v + 1.;vec2 u = w * 2.;");
    });
  });
});

describe(WebglVariables.name, () => {
  describe(WebglVariables.prototype.substituteUsingOutputsFrom.name, () => {
    it("fills in slots using another `WebglVariables` object correctly", () => {
      const dummyNode = new WebglConstantNode();
  
      const output = WebglSlot.out("outVector");
      const input = WebglSlot.in("inVector");
  
      const src = WebglVariables.template`vec3 ${output} = vec3(1.5, 2.9, 4.7);`({
        nodeOutVariables: {
          "myOutput": WebglTemplate.source`${output}`,
        },
      });
  
      const dst = WebglVariables.template`vec3 anotherVector = 2. + ${input};`();
  
      const newVariables = dst.substituteUsingOutputsFrom(
        src,
        NodeOutputTarget.NodeDisplay(dummyNode),
        {
          "myOutput": input,
        }
      );
  
      expect(newVariables.template.toString()).toMatch(/^vec3 anotherVector = 2. \+ (?:\w|\d|_)+;$/);
    });
  });
});