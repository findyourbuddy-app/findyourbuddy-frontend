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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const method = error.config?.method?.toUpperCase() || "";
    const fullUrl = `${error.config?.baseURL || ""}${error.config?.url || ""}`;
    if (error.response) {
      console.warn(`[API Error ${error.response.status}] ${method} ${fullUrl}:`, JSON.stringify(error.response.data));
    } else {
      console.warn(`[API Network Error] ${method} ${fullUrl}:`, error.message);
    }
    return Promise.reject(error);
  }
);

export function setAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}
