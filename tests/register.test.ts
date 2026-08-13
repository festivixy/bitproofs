import { beforeAll, describe, expect, it } from "vitest";
import { bitRegister } from "../src/register";
import { installFakeDocument } from "./dom-shim";

describe("bitRegister", () => {
  beforeAll(() => {
    installFakeDocument();
  });

  it("renders one cell per bit of width, MSB first", () => {
    const el = bitRegister(0, 8);
    const register = el.querySelector("span.register")!;
    expect(register.children.length).toBe(8);
  });

  it("marks bits set in the value with bit-set and the rest with bit-clear", () => {
    const el = bitRegister(0b10110000, 8);
    const register = el.querySelector("span.register")!;
    const classes = Array.from(register.children).map((child) => child.className);
    expect(classes).toEqual([
      "bit bit-flip-in bit-set",
      "bit bit-flip-in bit-clear",
      "bit bit-flip-in bit-set",
      "bit bit-flip-in bit-set",
      "bit bit-flip-in bit-clear",
      "bit bit-flip-in bit-clear",
      "bit bit-flip-in bit-clear",
      "bit bit-flip-in bit-clear",
    ]);
  });

  it("shows the value as 0bxxxxxxxx = N in a dim label", () => {
    const el = bitRegister(180, 8);
    const label = el.querySelector("span.bit-register-label")!;
    expect(label.textContent).toBe("0b10110100 = 180");
    expect(label.className).toContain("dim");
  });

  it("handles narrower widths", () => {
    const el = bitRegister(5, 4);
    const register = el.querySelector("span.register")!;
    expect(register.children.length).toBe(4);
    const label = el.querySelector("span.bit-register-label")!;
    expect(label.textContent).toBe("0b0101 = 5");
  });
});
