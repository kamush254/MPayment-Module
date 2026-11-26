import { describe, it, expect, vi } from "vitest";

vi.mock("../src/db/callbackRepository", () => ({ insertRawCallback: vi.fn() }));
vi.mock("../src/db/paymentRepository", () => ({
  markResult: vi.fn(),
  findByCheckoutRequestId: vi.fn(),
}));
vi.mock("../src/services/webhookServices", () => ({ sendWebhook: vi.fn() }));

import { mapStatus } from "../src/services/callbackService";
import { processStkCallback } from "../src/services/callbackService";
import * as repo from "../src/db/paymentRepository";

function payment(amount: number, status = "PENDING"): repo.Payment {
  return {
    id: "p1",
    idempotency_key: "key1",
    client_id: 1,
    amount,
    phone: "254700000000",
    account_reference: "ORDER",
    description: "Test",
    status,
    checkout_request_id: "ws_CO_TEST",
    merchant_request_id: "merchant1",
    mpesa_receipt: null,
    result_code: null,
    result_desc: null,
    webhook_url: null,
    webhook_delivered_at: null,
    created_at: new Date(0),
    updated_at: new Date(0),
  };
}

describe("mapStatus", () => {
  it("maps 0 to SUCCESS", () => {
    expect(mapStatus(0)).toBe("SUCCESS");
  });
  it("maps 1032 to CANCELLED", () => {
    expect(mapStatus(1032)).toBe("CANCELLED");
  });
  it("maps 1037 to TIMEOUT", () => {
    expect(mapStatus(1037)).toBe("TIMEOUT");
  });
  it("maps anything else to FAILED", () => {
    expect(mapStatus(2001)).toBe("FAILED");
    expect(mapStatus(1)).toBe("FAILED");
  });
});

function successCallback(amount: number) {
  return {
    Body: {
      stkCallback: {
        CheckoutRequestID: "ws_CO_TEST",
        ResultCode: 0,
        ResultDesc: "ok",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: amount },
            { Name: "MpesaReceiptNumber", Value: "RCPT1" },
          ],
        },
      },
    },
  };
}

describe("processStkCallback amount check", () => {
  it("ignores callbacks with a missing result code", async () => {
    vi.mocked(repo.findByCheckoutRequestId).mockClear();
    vi.mocked(repo.markResult).mockClear();

    await processStkCallback({
      Body: {
        stkCallback: {
          CheckoutRequestID: "ws_CO_TEST",
          ResultCode: null,
        },
      },
    });

    expect(repo.findByCheckoutRequestId).not.toHaveBeenCalled();
    expect(repo.markResult).not.toHaveBeenCalled();
  });

  it("does not finalise when the amount differs", async () => {
    vi.mocked(repo.findByCheckoutRequestId).mockResolvedValue(payment(5));
    vi.mocked(repo.markResult).mockClear();

    await processStkCallback(successCallback(1));

    expect(repo.markResult).not.toHaveBeenCalled();
  });

  it("finalises when the amount matches", async () => {
    vi.mocked(repo.findByCheckoutRequestId).mockResolvedValue(payment(5));
    vi.mocked(repo.markResult).mockResolvedValue(payment(5, "SUCCESS"));

    await processStkCallback(successCallback(5));

    expect(repo.markResult).toHaveBeenCalledWith(
      "ws_CO_TEST",
      "SUCCESS",
      0,
      "ok",
      "RCPT1"
    );
  });
});