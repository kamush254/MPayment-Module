import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class StkPushOutcomeUnknownError extends Error {}

  return {
    insertPayment: vi.fn(),
    findByIdempotencyKey: vi.fn(),
    resetForRetry: vi.fn(),
    attachCheckoutIds: vi.fn(),
    markFailed: vi.fn(),
    markUnconfirmedById: vi.fn(),
    findById: vi.fn(),
    markResult: vi.fn(),
    getDarajaConfig: vi.fn(),
    initiateStkPush: vi.fn(),
    StkPushOutcomeUnknownError,
    queryStkStatus: vi.fn(),
    mapStatus: vi.fn(),
    sendWebhook: vi.fn(),
  };
});

vi.mock("../src/db/paymentRepository", () => ({
  insertPayment: mocks.insertPayment,
  findByIdempotencyKey: mocks.findByIdempotencyKey,
  resetForRetry: mocks.resetForRetry,
  attachCheckoutIds: mocks.attachCheckoutIds,
  markFailed: mocks.markFailed,
  markUnconfirmedById: mocks.markUnconfirmedById,
  findById: mocks.findById,
  markResult: mocks.markResult,
}));
vi.mock("../src/services/darajaConfig", () => ({
  getDarajaConfig: mocks.getDarajaConfig,
}));
vi.mock("../src/services/darajaStk", () => ({
  initiateStkPush: mocks.initiateStkPush,
  StkPushOutcomeUnknownError: mocks.StkPushOutcomeUnknownError,
}));
vi.mock("../src/services/darajaQuery", () => ({
  queryStkStatus: mocks.queryStkStatus,
}));
vi.mock("../src/services/callbackService", () => ({
  mapStatus: mocks.mapStatus,
}));
vi.mock("../src/services/webhookServices", () => ({
  sendWebhook: mocks.sendWebhook,
}));

import { createPayment } from "../src/services/paymentServices";
import { StkPushOutcomeUnknownError } from "../src/services/darajaStk";

const input = {
  idempotencyKey: "client-1:order-1",
  clientId: 1,
  amount: 1,
  phone: "254700000000",
  accountReference: "ORDER001",
  description: "Test",
};

const payment = {
  id: "payment-1",
  idempotency_key: input.idempotencyKey,
  client_id: input.clientId,
  amount: input.amount,
  phone: input.phone,
  account_reference: input.accountReference,
  description: input.description,
  status: "PENDING",
  checkout_request_id: null,
  merchant_request_id: null,
  mpesa_receipt: null,
  result_code: null,
  result_desc: null,
  webhook_url: null,
  webhook_delivered_at: null,
  created_at: new Date(0),
  updated_at: new Date(0),
};

describe("createPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDarajaConfig.mockResolvedValue({});
    mocks.markFailed.mockResolvedValue(null);
    mocks.markUnconfirmedById.mockResolvedValue(null);
  });

  it("does not resubmit an STK request whose outcome is unknown", async () => {
    mocks.insertPayment
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce(null);
    mocks.initiateStkPush.mockRejectedValueOnce(
      new StkPushOutcomeUnknownError("request timed out")
    );
    mocks.findByIdempotencyKey.mockResolvedValue({
      ...payment,
      status: "UNCONFIRMED",
    });

    await expect(createPayment(input)).rejects.toThrow("request timed out");
    expect(mocks.markUnconfirmedById).toHaveBeenCalledWith(
      payment.id,
      expect.any(String)
    );

    const duplicate = await createPayment(input);

    expect(duplicate.created).toBe(false);
    expect(duplicate.payment.status).toBe("UNCONFIRMED");
    expect(mocks.initiateStkPush).toHaveBeenCalledTimes(1);
    expect(mocks.resetForRetry).not.toHaveBeenCalled();
  });
});
