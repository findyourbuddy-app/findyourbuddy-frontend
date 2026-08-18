import { Platform } from "react-native";
import { apiClient } from "./client";
import type { User, UserPhoto, UserUpdate } from "../types";

// RN's FormData polyfill understands { uri, name, type } on native, but on
// web FormData is the real browser API and needs an actual Blob/File --
// passing the RN-style object there silently produces an empty upload.
export async function toUploadFile(uri: string, fileName: string): Promise<Blob> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type || "image/jpeg" });
  }
  return { uri, name: fileName, type: "image/jpeg" } as unknown as Blob;
}

export function getCurrentUser(): Promise<User> {
  return apiClient.get<User>("/users/me").then((res) => res.data);
}

export function updateCurrentUser(data: UserUpdate): Promise<User> {
  return apiClient.patch<User>("/users/me", data).then((res) => res.data);
}

export function deleteCurrentUser(): Promise<void> {
  return apiClient.delete("/users/me").then(() => undefined);
}

export async function uploadProfilePhoto(uri: string, fileName: string): Promise<User> {
  const formData = new FormData();
  formData.append("file", await toUploadFile(uri, fileName));

  return apiClient
    .post<User>("/users/me/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => res.data);
}

export function listMyPhotos(): Promise<UserPhoto[]> {
  return apiClient.get<UserPhoto[]>("/users/me/photos").then((res) => res.data);
}

export async function uploadGalleryPhoto(uri: string, fileName: string): Promise<UserPhoto> {
  const formData = new FormData();
  formData.append("file", await toUploadFile(uri, fileName));

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

export function activateBoost(): Promise<User> {
  return apiClient.post<User>("/users/me/boost").then((res) => res.data);
}

export function createPurchaseCheckoutSession(
  itemType: "boost" | "super_likes" | "swipes",
  quantity: number
): Promise<{ checkout_url: string }> {
  return apiClient
    .post<{ checkout_url: string }>("/users/me/purchase/checkout-session", {
      item_type: itemType,
      quantity,
    })
    .then((res) => res.data);
}

export async function uploadMedia(uri: string, fileName: string): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", await toUploadFile(uri, fileName));

  return apiClient
    .post<{ url: string }>("/users/me/media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => res.data);
}

export function verifyPhotoWithVision(selfiePhotoUrl: string): Promise<{ verified: boolean; message: string }> {
  return apiClient
    .post<{ verified: boolean; message: string }>("/users/me/verify-photo", {
      selfie_photo_url: selfiePhotoUrl,
    })
    .then((res) => res.data);
}
