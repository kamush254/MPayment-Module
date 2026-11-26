import { describe, expect, it, vi } from "vitest";

const { processStkCallback } = vi.hoisted(() => ({
  processStkCallback: vi.fn(),
}));

vi.mock("../src/config/env", () => ({
  env: { callbackToken: "test-token" },
}));
vi.mock("../src/services/callbackService", () => ({
  processStkCallback,
}));

import { handleStkCallback } from "../src/controllers/callbackController";

describe("handleStkCallback", () => {
  it("does not acknowledge callbacks that were not processed", async () => {
    processStkCallback.mockRejectedValueOnce(new Error("database unavailable"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = {
      status: vi.fn(),
      json: vi.fn(),
    };
    response.status.mockReturnValue(response);
    const request = {
      params: { token: "test-token" },
      body: {},
    } as Parameters<typeof handleStkCallback>[0];

    await handleStkCallback(
      request,
      response as unknown as Parameters<typeof handleStkCallback>[1]
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      ResultCode: 1,
      ResultDesc: "Callback processing failed",
    });
    errorLog.mockRestore();
  });
});
