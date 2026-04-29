import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────
// Token storage helpers
// ─────────────────────────────────────────
const TOKEN_KEY         = "ds_access_token";
const REFRESH_TOKEN_KEY = "ds_refresh_token";

export const tokenStorage = {
  getAccess:    (): string | null => (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null),
  setAccess:    (t: string)       => typeof window !== "undefined" && localStorage.setItem(TOKEN_KEY, t),
  getRefresh:   (): string | null => (typeof window !== "undefined" ? localStorage.getItem(REFRESH_TOKEN_KEY) : null),
  setRefresh:   (t: string)       => typeof window !== "undefined" && localStorage.setItem(REFRESH_TOKEN_KEY, t),
  clear:        ()                => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
};

// ─────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────
const BASE_URL =
  (typeof process !== "undefined" && process.env?.["NEXT_PUBLIC_API_URL"]) ||
  (typeof process !== "undefined" && process.env?.["EXPO_PUBLIC_API_URL"]) ||
  "http://localhost:4000/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // send httpOnly cookies
});

// ─────────────────────────────────────────
// Request interceptor — attach JWT
// ─────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccess();
    if (token && config.headers) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────
// Response interceptor — 401 → auto refresh → redirect
// ─────────────────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function drainQueue(error: unknown, token: string | null = null) {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  pendingQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Only handle 401 — skip if already retried or if it's the refresh call itself
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    // Queue concurrent requests while refresh is in-flight
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        if (original.headers) original.headers["Authorization"] = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = tokenStorage.getRefresh();

    if (!refreshToken) {
      tokenStorage.clear();
      isRefreshing = false;
      redirectToLogin();
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post<ApiSuccess<{ tokens: { accessToken: string; refreshToken?: string } }>>(
        `${BASE_URL}/auth/refresh`,
        { refreshToken },
        { withCredentials: true }
      );

      const newAccess = data.data.tokens.accessToken;
      tokenStorage.setAccess(newAccess);
      if (data.data.tokens.refreshToken) {
        tokenStorage.setRefresh(data.data.tokens.refreshToken);
      }

      drainQueue(null, newAccess);

      if (original.headers) original.headers["Authorization"] = `Bearer ${newAccess}`;
      return api(original);
    } catch (refreshError) {
      drainQueue(refreshError, null);
      tokenStorage.clear();
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.href = "/login?reason=session_expired";
  }
}

// ─────────────────────────────────────────
// Typed request helpers
// ─────────────────────────────────────────
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await api.get<ApiSuccess<T>>(url, { params });
  return data.data;
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.post<ApiSuccess<T>>(url, body);
  return data.data;
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<ApiSuccess<T>>(url, body);
  return data.data;
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.put<ApiSuccess<T>>(url, body);
  return data.data;
}

export async function del<T>(url: string): Promise<T> {
  const { data } = await api.delete<ApiSuccess<T>>(url);
  return data.data;
}

export default api;
