import { beforeEach, describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("axios", () => ({
  default: {
    post,
    isAxiosError: (error: unknown) =>
      typeof error === "object" && error !== null && "isAxiosError" in error,
  },
}));
vi.mock("../src/services/darajaAuth", () => ({
  getAccessToken: vi.fn().mockResolvedValue("access-token"),
}));
vi.mock("../src/utils/timestamp", () => ({
  buildTimestamp: () => "20260101000000",
}));

import {
  initiateStkPush,
  StkPushOutcomeUnknownError,
} from "../src/services/darajaStk";
import { DarajaConfig } from "../src/services/darajaConfig";

const input = {
  amount: 1,
  phone: "254700000000",
  accountReference: "ORDER001",
  description: "Test",
};

const baseConfig: DarajaConfig = {
  baseUrl: "https://sandbox.safaricom.co.ke",
  shortcode: "123456",
  passkey: "passkey",
  consumerKey: "consumer-key",
  consumerSecret: "consumer-secret",
  callbackUrl: "https://example.com/callback",
  transactionType: "CustomerPayBillOnline",
  partyB: "123456",
};

describe("initiateStkPush transaction details", () => {
  beforeEach(() => {
    post.mockReset().mockResolvedValue({
      data: {
        MerchantRequestID: "merchant-request",
        CheckoutRequestID: "checkout-request",
        ResponseCode: "0",
        ResponseDescription: "Accepted",
        CustomerMessage: "Success",
      },
    });
  });

  it("uses the paybill transaction type and shortcode as PartyB", async () => {
    await initiateStkPush(input, baseConfig);

    expect(post.mock.calls[0][1]).toMatchObject({
      TransactionType: "CustomerPayBillOnline",
      PartyB: "123456",
    });
  });

  it("uses the buy-goods transaction type and till number as PartyB", async () => {
    await initiateStkPush(input, {
      ...baseConfig,
      transactionType: "CustomerBuyGoodsOnline",
      partyB: "654321",
    });

    expect(post.mock.calls[0][1]).toMatchObject({
      TransactionType: "CustomerBuyGoodsOnline",
      PartyB: "654321",
    });
  });

  it("marks a lost STK response as having an unknown outcome", async () => {
    post.mockRejectedValueOnce(new Error("request timed out"));

    await expect(initiateStkPush(input, baseConfig)).rejects.toBeInstanceOf(
      StkPushOutcomeUnknownError
    );
  });
});
