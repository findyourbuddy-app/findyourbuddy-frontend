import { apiClient } from "./client";
import type { User, UserUpdate } from "../types";

export function getCurrentUser(): Promise<User> {
  return apiClient.get<User>("/users/me").then((res) => res.data);
}

export function updateCurrentUser(data: UserUpdate): Promise<User> {
  return apiClient.patch<User>("/users/me", data).then((res) => res.data);
}

export function uploadProfilePhoto(uri: string, fileName: string): Promise<User> {
  const formData = new FormData();
  formData.append("file", {
    uri,
    name: fileName,
    type: "image/jpeg",
  } as unknown as Blob);

  return apiClient
    .post<User>("/users/me/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => res.data);
}
