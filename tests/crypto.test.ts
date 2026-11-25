import { describe, it, expect, vi } from "vitest";

vi.mock("../src/config/env", () => ({
  env: { encryptionKey: "a".repeat(64) },
}));

import { encrypt, decrypt } from "../src/utils/crypto";

describe("encrypt and decrypt", () => {
  it("gives back the same text", () => {
    expect(decrypt(encrypt("my-secret-passkey"))).toBe("my-secret-passkey");
  });

  it("does not show the original text", () => {
    expect(encrypt("my-secret-passkey")).not.toContain("my-secret-passkey");
  });

  it("gives different scrambled text each time", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });

  it("refuses text that was changed", () => {
    const stored = encrypt("hello");
    const broken = stored.slice(0, -4) + "AAAA";
    expect(() => decrypt(broken)).toThrow();
  });
});