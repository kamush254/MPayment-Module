import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("../src/db/pool", () => ({
  pool: { query },
}));
vi.mock("../src/utils/crypto", () => ({
  encrypt: vi.fn((value: string) => value),
  decrypt: vi.fn((value: string) => value),
}));

import { createClient, findClientByName } from "../src/db/apiClientRepository";

describe("API client repository", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("returns the client ID after creation", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 12 }] });

    await expect(createClient("App", "hash", "secret")).resolves.toBe(12);
  });

  it("rejects ambiguous client names", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 9 }, { id: 10 }] });

    await expect(findClientByName("Duplicate")).rejects.toThrow(
      'Multiple active clients named "Duplicate"; use the client ID instead'
    );
  });
});
