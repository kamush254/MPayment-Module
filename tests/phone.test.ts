import { describe, it, expect } from "vitest";
import { normalizePhone } from "../src/utils/phone";

describe("normalizePhone", () => {
  it("converts a leading 0", () => {
    expect(normalizePhone("0708374149")).toBe("254708374149");
  });

  it("strips spaces and plus signs", () => {
    expect(normalizePhone("+254 708 374 149")).toBe("254708374149");
  });

  it("accepts numbers without the prefix", () => {
    expect(normalizePhone("708374149")).toBe("254708374149");
  });

  it("accepts the 01 series", () => {
    expect(normalizePhone("0112345678")).toBe("254112345678");
  });

  it("rejects invalid numbers", () => {
    expect(() => normalizePhone("12345")).toThrow();
    expect(() => normalizePhone("0508374149")).toThrow();
  });
});