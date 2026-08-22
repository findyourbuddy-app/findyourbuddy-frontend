import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const __DEV__ = process.env.NODE_ENV !== "production";

function requireEnv(key: string, devFallback: string): string {
  const value = process.env[key];
  if (value && value.trim()) return value.trim();
  if (__DEV__) return devFallback;
  throw new Error(`Missing required Firebase env var: ${key}`);
}

export const firebaseConfig = {
  apiKey: requireEnv("EXPO_PUBLIC_FIREBASE_API_KEY", "AIzaSyDummyApiKeyForDevTestingOnly12345"),
  authDomain: requireEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN", "findyourbuddy-dev.firebaseapp.com"),
  projectId: requireEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID", "findyourbuddy-dev"),
  storageBucket: requireEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET", "findyourbuddy-dev.appspot.com"),
  messagingSenderId: requireEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "123456789012"),
  appId: requireEnv("EXPO_PUBLIC_FIREBASE_APP_ID", "1:123456789012:web:abc123def4567890"),
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(app);
export const db = getFirestore(app);
export default app;

export const googleAuthConfig = {
  webClientId: requireEnv("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", "REPLACE_WITH_GOOGLE_WEB_CLIENT_ID"),
  iosClientId: requireEnv("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID", "REPLACE_WITH_GOOGLE_IOS_CLIENT_ID"),
  androidClientId: requireEnv("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID", "REPLACE_WITH_GOOGLE_ANDROID_CLIENT_ID"),
};
