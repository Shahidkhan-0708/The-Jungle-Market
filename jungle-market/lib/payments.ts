"use client";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export type PaymentOrder = {
  order_id: string;
  gateway_order_id: string;
  amount: number;
  currency: string;
  provider: "mock";
  ondc: OndcOrder;
};

export type OndcOrder = {
  order_id: string;
  network_order_id: string;
  transaction_id: string;
  network: "ONDC_LOCAL_SANDBOX";
  beckn_version: string;
  beckn_actions: string[];
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  payment_status: "PAID" | "NOT-PAID" | "REFUNDED_SIMULATED";
  fulfillment_stage: "AWAITING_PAYMENT" | "CONFIRMED" | "PROCESSING" | "READY_TO_SHIP" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  signature: string;
  total_amount: number;
};

export type PaymentMethod = "upi" | "card" | "netbanking";

export type PaymentResult = {
  gateway_order_id: string;
  payment_id: string;
  signature: string;
};

async function api<T>(path: string, body: unknown, accessToken: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null) as T | {detail?: string} | null;
  if (!response.ok) {
    const detail = typeof data === "object" && data !== null && "detail" in data ? data.detail : null;
    throw new Error(typeof detail === "string" ? detail : "Payment service unavailable.");
  }
  return data as T;
}

async function authorized<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {"Content-Type": "application/json", Authorization: `Bearer ${accessToken}`},
  });
  const data = await response.json().catch(() => null) as T | {detail?: string} | null;
  if (!response.ok) {
    const detail = typeof data === "object" && data !== null && "detail" in data ? data.detail : null;
    throw new Error(typeof detail === "string" ? detail : "ONDC sandbox unavailable.");
  }
  return data as T;
}

export function createPaymentOrder(
  productId: string,
  quantity: number,
  shippingAddress: string,
  accessToken: string,
  requestId: string = crypto.randomUUID(),
) {
  return api<PaymentOrder>("/v1/orders/checkout", {
    items: [{product_id: productId, qty: quantity}],
    shipping_address: shippingAddress,
    network: "ondc",
    request_id: requestId,
  }, accessToken);
}

export function processMockPayment(
  localOrderId: string,
  method: PaymentMethod,
  simulateFailure: boolean,
  accessToken: string,
) {
  return api<PaymentResult>(
    `/v1/orders/${localOrderId}/payment/mock`,
    {method, simulate_failure: simulateFailure},
    accessToken,
  );
}

export function verifyPayment(localOrderId: string, payment: PaymentResult, accessToken: string) {
  return api<{status: string; payment_id: string; ondc: OndcOrder}>(
    `/v1/orders/${localOrderId}/payment/verify`,
    payment,
    accessToken,
  );
}

export function getOndcOrder(localOrderId: string, accessToken: string) {
  return authorized<OndcOrder>(`/v1/orders/${localOrderId}/status`, accessToken);
}

export function updateOndcFulfillment(localOrderId: string, status: string, accessToken: string) {
  return authorized<OndcOrder>(
    `/v1/orders/${localOrderId}/fulfill?status=${encodeURIComponent(status)}`,
    accessToken,
    {method: "POST"},
  );
}

export function cancelOndcOrder(localOrderId: string, accessToken: string) {
  return authorized<OndcOrder>(`/v1/orders/${localOrderId}/cancel`, accessToken, {
    method: "POST",
    body: JSON.stringify({reason: "Cancelled by buyer"}),
  });
}
