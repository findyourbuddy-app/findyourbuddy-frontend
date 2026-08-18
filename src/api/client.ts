import axios from "axios";
import { getApiBaseUrl } from "../constants/config";

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
});

apiClient.interceptors.request.use((config) => {
  const baseUrl = getApiBaseUrl();
  config.baseURL = baseUrl;
  console.log(`[API Request] ${config.method?.toUpperCase()} ${baseUrl}${config.url}`);
  return config;
});

export function setAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}
