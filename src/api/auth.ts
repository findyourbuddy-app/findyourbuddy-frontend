import { apiClient } from "./client";
import type { LoginPayload, RegisterPayload, Token, User } from "../types";

export function login(payload: LoginPayload): Promise<Token> {
  return apiClient.post<Token>("/auth/login", payload).then((res) => res.data);
}

export function register(payload: RegisterPayload): Promise<User> {
  return apiClient.post<User>("/auth/register", payload).then((res) => res.data);
}

export function requestPasswordReset(email: string): Promise<void> {
  return apiClient.post("/auth/password-reset/request", { email }).then(() => undefined);
}

export function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  return apiClient
    .post("/auth/password-reset/confirm", { token, new_password: newPassword })
    .then(() => undefined);
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiClient
    .post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    })
    .then(() => undefined);
}

export function verifyPhoneCode(code: string): Promise<void> {
  return apiClient.post("/auth/phone/verify", { code }).then(() => undefined);
}

export function resendPhoneCode(): Promise<void> {
  return apiClient.post("/auth/phone/resend").then(() => undefined);
}
