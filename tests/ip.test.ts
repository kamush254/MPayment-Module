import { describe, it, expect } from "vitest";
import { isAllowedIp, normalizeIp } from "../src/utils/ip";

describe("ip allow-list", () => {
  it("strips the IPv6 prefix", () => {
    expect(normalizeIp("::ffff:1.2.3.4")).toBe("1.2.3.4");
  });
  it("allows listed addresses", () => {
    expect(isAllowedIp("::ffff:1.2.3.4", ["1.2.3.4"])).toBe(true);
  });
  it("rejects unlisted or missing addresses", () => {
    expect(isAllowedIp("9.9.9.9", ["1.2.3.4"])).toBe(false);
    expect(isAllowedIp(undefined, ["1.2.3.4"])).toBe(false);
  });
});