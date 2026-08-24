import { Platform } from "react-native";
import { apiClient } from "./client";
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from "../constants/config";
import { getToken } from "../utils/tokenStorage";
import type { User, UserPhoto, UserUpdate } from "../types";

// RN's FormData polyfill understands { uri, name, type } on native, but on
// web FormData is the real browser API and needs an actual Blob/File --
// passing the RN-style object there silently produces an empty upload.
export async function toUploadFile(
  uri: string,
  rawFileName: string,
  mimeType = "image/jpeg"
): Promise<Blob> {
  let normalizedUri = (uri || "").split("?")[0];
  if (Platform.OS === "android" && !normalizedUri.startsWith("file://") && !normalizedUri.startsWith("content://")) {
    normalizedUri = `file://${normalizedUri}`;
  }

  const cleanName = (rawFileName.split("?")[0] || "photo.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const lower = cleanName.toLowerCase();
  let ext = ".jpg";
  let type = "image/jpeg";
  if (lower.endsWith(".png")) {
    ext = ".png";
    type = "image/png";
  } else if (lower.endsWith(".webp")) {
    ext = ".webp";
    type = "image/webp";
  }

  const baseName = cleanName.substring(0, cleanName.lastIndexOf(".")) || cleanName;
  const fileName = `${baseName.slice(0, 30)}${ext}`;

  if (Platform.OS === "web") {
    const response = await fetch(normalizedUri);
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type || type });
  }
  return { uri: normalizedUri, name: fileName, type } as unknown as Blob;
}

// Use XMLHttpRequest on native mobile for 100% reliable multipart FormData uploads
async function postMultipart<T>(path: string, formData: FormData): Promise<T> {
  let auth = apiClient.defaults.headers.common?.Authorization;
  if (!auth) {
    const storedToken = await getToken(AUTH_TOKEN_STORAGE_KEY);
    if (storedToken) {
      auth = `Bearer ${storedToken}`;
    }
  }

  if (Platform.OS === "web") {
    return apiClient
      .post<T>(path, formData, { timeout: 60000 })
      .then((res) => res.data);
  }

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}${path}`);
    if (auth) {
      xhr.setRequestHeader("Authorization", String(auth));
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data as T);
        } catch {
          reject(new Error("Sunucudan geçersiz yanıt alındı."));
        }
      } else {
        let errorMsg = `Sunucu hatası (${xhr.status})`;
        try {
          const errJson = JSON.parse(xhr.responseText);
          if (errJson.detail) {
            errorMsg = typeof errJson.detail === "string" ? errJson.detail : errJson.detail[0]?.msg || errorMsg;
          }
        } catch {
          if (xhr.responseText) errorMsg = xhr.responseText;
        }
        reject(new Error(errorMsg));
      }
    };
    xhr.onerror = () => {
      reject(new Error("Fotoğraf sunucuya iletilemedi. Lütfen bağlantını kontrol et."));
    };
    xhr.ontimeout = () => {
      reject(new Error("Fotoğraf yükleme zaman aşımına uğradı."));
    };
    xhr.timeout = 60000;
    xhr.send(formData as any);
  });
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
  return postMultipart<User>("/users/me/photo", formData);
}

export function listMyPhotos(): Promise<UserPhoto[]> {
  return apiClient.get<UserPhoto[]>("/users/me/photos").then((res) => res.data);
}

export async function uploadGalleryPhoto(uri: string, fileName: string): Promise<UserPhoto> {
  const formData = new FormData();
  formData.append("file", await toUploadFile(uri, fileName));
  return postMultipart<UserPhoto>("/users/me/photos", formData);
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
  return postMultipart<{ url: string }>("/users/me/media", formData);
}

export async function uploadVoiceNote(uri: string): Promise<User> {
  const formData = new FormData();
  formData.append("file", await toUploadFile(uri, "voice_note.m4a", "audio/m4a"));
  return postMultipart<User>("/users/me/voice-note", formData);
}

export function verifyPhotoWithVision(selfiePhotoUrl: string): Promise<{ verified: boolean; message: string }> {
  return apiClient
    .post<{ verified: boolean; message: string }>("/users/me/verify-photo", {
      selfie_photo_url: selfiePhotoUrl,
    })
    .then((res) => res.data);
}

export function getUserById(userId: number): Promise<User> {
  return apiClient.get<User>(`/users/${userId}`).then((res) => res.data);
}
