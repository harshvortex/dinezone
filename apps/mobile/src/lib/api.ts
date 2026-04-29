import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import axios, { type AxiosInstance } from "axios";

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:4000/api/v1";

const KEYS = { ACCESS: "ds_access_token", REFRESH: "ds_refresh_token" } as const;

export const tokenStore = {
  getAccess:    ()                  => SecureStore.getItemAsync(KEYS.ACCESS),
  getRefresh:   ()                  => SecureStore.getItemAsync(KEYS.REFRESH),
  setAccess:    (v: string)         => SecureStore.setItemAsync(KEYS.ACCESS, v),
  setRefresh:   (v: string)         => SecureStore.setItemAsync(KEYS.REFRESH, v),
  clear:        ()                  => Promise.all([SecureStore.deleteItemAsync(KEYS.ACCESS), SecureStore.deleteItemAsync(KEYS.REFRESH)]),
};

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) return Promise.reject(err);
    original._retry = true;

    if (isRefreshing) {
      return new Promise(resolve => queue.push(token => { original.headers.Authorization = `Bearer ${token}`; resolve(api(original)); }));
    }

    isRefreshing = true;
    try {
      const refreshToken = await tokenStore.getRefresh();
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      const newToken = data.data.accessToken;
      await tokenStore.setAccess(newToken);
      queue.forEach(fn => fn(newToken));
      queue = [];
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch {
      await tokenStore.clear();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export const apiGet  = <T>(url: string, params?: object) => api.get<{ data: T; success: boolean }>(url, { params }).then(r => r.data.data);
export const apiPost = <T>(url: string, body?: object) => api.post<{ data: T; success: boolean }>(url, body).then(r => r.data.data);
export const apiPut  = <T>(url: string, body?: object) => api.put<{ data: T; success: boolean }>(url, body).then(r => r.data.data);
export const apiDel  = <T>(url: string) => api.delete<{ data: T; success: boolean }>(url).then(r => r.data.data);

export default api;
