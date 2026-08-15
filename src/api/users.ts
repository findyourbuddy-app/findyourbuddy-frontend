import { apiClient } from "./client";
import type { User, UserPhoto, UserUpdate } from "../types";

export function getCurrentUser(): Promise<User> {
  return apiClient.get<User>("/users/me").then((res) => res.data);
}

export function updateCurrentUser(data: UserUpdate): Promise<User> {
  return apiClient.patch<User>("/users/me", data).then((res) => res.data);
}

export function deleteCurrentUser(): Promise<void> {
  return apiClient.delete("/users/me").then(() => undefined);
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

export function listMyPhotos(): Promise<UserPhoto[]> {
  return apiClient.get<UserPhoto[]>("/users/me/photos").then((res) => res.data);
}

export function uploadGalleryPhoto(uri: string, fileName: string): Promise<UserPhoto> {
  const formData = new FormData();
  formData.append("file", {
    uri,
    name: fileName,
    type: "image/jpeg",
  } as unknown as Blob);

  return apiClient
    .post<UserPhoto>("/users/me/photos", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => res.data);
}

export function deleteGalleryPhoto(photoId: number): Promise<void> {
  return apiClient.delete(`/users/me/photos/${photoId}`).then(() => undefined);
}

export function exportMyData(): Promise<unknown> {
  return apiClient.get("/users/me/export").then((res) => res.data);
}
