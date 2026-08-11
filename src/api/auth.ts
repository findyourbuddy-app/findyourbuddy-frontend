import { apiClient } from "./client";
import type { LoginPayload, RegisterPayload, Token, User } from "../types";

export function login(payload: LoginPayload): Promise<Token> {
  return apiClient.post<Token>("/auth/login", payload).then((res) => res.data);
}

export function register(payload: RegisterPayload): Promise<User> {
  return apiClient.post<User>("/auth/register", payload).then((res) => res.data);
}
