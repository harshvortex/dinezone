import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from "axios";
import type { ApiResponse } from "@dinespot/types";

// ─────────────────────────────────────────
// Token storage abstraction
// Works in both browser (localStorage) and React Native (SecureStore stub)
// ─────────────────────────────────────────
interface TokenStore {
  getAccessToken: () => string | null;
  setAccessToken: (token: string) => void;
  getRefreshToken: () => string | null;
  setRefreshToken: (token: string) => void;
  clear: () => void;
}

const browserTokenStore: TokenStore = {
  getAccessToken: () =>
    typeof window !== "undefined" ? localStorage.getItem("ds_access_token") : null,
  setAccessToken: (t) =>
    typeof window !== "undefined" && localStorage.setItem("ds_access_token", t),
  getRefreshToken: () =>
    typeof window !== "undefined" ? localStorage.getItem("ds_refresh_token") : null,
  setRefreshToken: (t) =>
    typeof window !== "undefined" && localStorage.setItem("ds_refresh_token", t),
  clear: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ds_access_token");
      localStorage.removeItem("ds_refresh_token");
    }
  },
};

// ─────────────────────────────────────────
// API Client factory
// ─────────────────────────────────────────
export function createApiClient(
  baseURL: string,
  tokenStore: TokenStore = browserTokenStore
): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 15_000,
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });

  // ── Request interceptor: attach access token ──
  client.interceptors.request.use((config) => {
    const token = tokenStore.getAccessToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });

  // ── Response interceptor: handle 401 → refresh ──
  let isRefreshing = false;
  let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
      if (error) prom.reject(error);
      else prom.resolve(token);
    });
    failedQueue = [];
  };

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers["Authorization"] = `Bearer ${token}`;
              }
              return client(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = tokenStore.getRefreshToken();

        if (!refreshToken) {
          tokenStore.clear();
          isRefreshing = false;
          return Promise.reject(error);
        }

        try {
          const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          const newAccessToken: string = data.data.tokens.accessToken;
          tokenStore.setAccessToken(newAccessToken);
          if (data.data.tokens.refreshToken) {
            tokenStore.setRefreshToken(data.data.tokens.refreshToken);
          }
          processQueue(null, newAccessToken);
          if (originalRequest.headers) {
            originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          }
          return client(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          tokenStore.clear();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

// ─────────────────────────────────────────
// Default singleton client
// ─────────────────────────────────────────
const API_URL =
  (typeof process !== "undefined" && process.env["NEXT_PUBLIC_API_URL"]) ||
  (typeof process !== "undefined" && process.env["EXPO_PUBLIC_API_URL"]) ||
  "http://localhost:4000/api/v1";

export const apiClient = createApiClient(API_URL);

// ─────────────────────────────────────────
// Typed request helpers
// ─────────────────────────────────────────
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.get<ApiResponse<T>>(url, { params });
  if (!data.success) throw new Error((data as { error: { message: string } }).error.message);
  return (data as { data: T }).data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post<ApiResponse<T>>(url, body);
  if (!data.success) throw new Error((data as { error: { message: string } }).error.message);
  return (data as { data: T }).data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch<ApiResponse<T>>(url, body);
  if (!data.success) throw new Error((data as { error: { message: string } }).error.message);
  return (data as { data: T }).data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const { data } = await apiClient.delete<ApiResponse<T>>(url);
  if (!data.success) throw new Error((data as { error: { message: string } }).error.message);
  return (data as { data: T }).data;
}
