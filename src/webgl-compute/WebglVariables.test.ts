import { describe, expect, it } from "vitest";
import { WebglSlot, WebglTemplate, WebglVariables } from "./WebglVariables";
import { NodeOutputTarget } from "@/models/Node";
import { DummyNode } from "@/models/Node.test";

describe(WebglTemplate.name, () => {
  it("fills slots properly", () => {
    const input = WebglSlot.in("input");

    const template = WebglTemplate.code`float vector = ${input} + 1.;`;
    const filledTemplate = template.substitute(new Map([
      [input, "6.28"],
    ]));

    expect(filledTemplate.toString()).toBe("float vector = 6.28 + 1.;");
  });
});

describe(WebglVariables.name, () => {
  it("fills in slots using another `WebglVariables` object correctly", () => {
    const dummyNode = new DummyNode();

    const output = WebglSlot.out("outVector");
    const input = WebglSlot.in("inVector");

    const src = WebglVariables.template`vec3 ${output} = vec3(1.5, 2.9, 4.7);`({
      nodeOutVariables: {
        "myOutput": WebglTemplate.code`${output}`,
      },
    });

    const dst = WebglVariables.template`vec3 anotherVector = 2. + ${input};`();

    const newVariables = dst.substituteUsingOutputsFrom(
      src,
      NodeOutputTarget.NodeDisplay(dummyNode),
      new Map([
        ["myOutput", input],
      ]),
    );

    expect(newVariables.template.toString()).toMatch(/^vec3 anotherVector = 2. \+ (?:\w|\d|_)+;$/);
  });
});