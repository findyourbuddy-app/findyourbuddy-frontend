import axios from "axios";
import { getApiBaseUrl, AUTH_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY } from "../constants/config";
import { deleteToken, getToken, setToken } from "../utils/tokenStorage";

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
});

declare const __DEV__: boolean;

apiClient.interceptors.request.use((config) => {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    const baseUrl = config.baseURL || getApiBaseUrl();
    console.log(`[API Request] ${config.method?.toUpperCase()} ${baseUrl}${config.url}`);
  }
  return config;
});

// Called when a refresh attempt definitively fails (no/invalid refresh
// token) so AuthContext can sign the user out. Set via setOnAuthFailure.
let onAuthFailure: (() => void) | null = null;

export function setOnAuthFailure(callback: (() => void) | null): void {
  onAuthFailure = callback;
}

export function setAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

// Concurrent 401s (several requests in flight when the access token expires)
// should trigger exactly one refresh call, not one per request.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getToken(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) return null;

  try {
    const response = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    const { access_token, refresh_token } = response.data as {
      access_token: string;
      refresh_token: string;
    };
    await Promise.all([
      setToken(AUTH_TOKEN_STORAGE_KEY, access_token),
      setToken(REFRESH_TOKEN_STORAGE_KEY, refresh_token),
    ]);
    setAuthToken(access_token);
    return access_token;
  } catch (error: any) {
    const status = error?.response?.status;
    // Only clear session if server explicitly rejects refresh token with 400 or 401
    if (status === 400 || status === 401) {
      await Promise.all([deleteToken(AUTH_TOKEN_STORAGE_KEY), deleteToken(REFRESH_TOKEN_STORAGE_KEY)]);
      setAuthToken(null);
    }
    return null;
  }
}

const _MAX_RETRIES = 3;

function _isRetryable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  // Network error (no response) or 5xx server error — exclude 501 Not Implemented
  if (!error.response) return true;
  const status = error.response.status;
  return status >= 500 && status !== 501;
}

async function _wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      const method = error.config?.method?.toUpperCase() || "";
      const fullUrl = `${error.config?.baseURL || ""}${error.config?.url || ""}`;
      if (error.response) {
        console.warn(`[API Error ${error.response.status}] ${method} ${fullUrl}`);
      } else {
        console.warn(`[API Network Error] ${method} ${fullUrl}:`, error.message);
      }
    }

    const original = error.config;
    const isAuthEndpoint = original?.url?.startsWith("/auth/login") || original?.url?.startsWith("/auth/refresh");
    if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newAccessToken}` };
        return apiClient(original);
      }
      const activeToken = await getToken(AUTH_TOKEN_STORAGE_KEY);
      if (!activeToken) {
        onAuthFailure?.();
      }
    }

    // Retry transient network errors and 5xx responses with exponential backoff
    if (original && _isRetryable(error) && (original._retryCount ?? 0) < _MAX_RETRIES) {
      original._retryCount = (original._retryCount ?? 0) + 1;
      await _wait(200 * 2 ** (original._retryCount - 1));
      return apiClient(original);
    }

    return Promise.reject(error);
  }
);
