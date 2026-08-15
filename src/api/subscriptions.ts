import { apiClient } from "./client";
import type { SubscriptionStatus } from "../types";

export function getMySubscription(): Promise<SubscriptionStatus> {
  return apiClient.get<SubscriptionStatus>("/subscriptions/me").then((res) => res.data);
}

export function createCheckoutSession(): Promise<{ checkout_url: string }> {
  return apiClient.post<{ checkout_url: string }>("/subscriptions/checkout-session").then((res) => res.data);
}
