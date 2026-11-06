import axios, { type AxiosRequestConfig } from "axios";
import type { ApiSuccess } from "@elms/shared";

// All requests go through the Vite proxy (/api -> Express) so HTTP-only cookies just work
const api = axios.create({ baseURL: "/api/v1", withCredentials: true });

let refreshPromise: Promise<unknown> | null = null;
let onSessionExpired: () => void = () => undefined;

export const setSessionExpiredHandler = (handler: () => void) => {
  onSessionExpired = handler;
};

const SKIP_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

// Access token lives 15 min: on a 401 we silently refresh once (shared across parallel calls) and retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const shouldRefresh =
      error.response?.status === 401 && original && !original._retry && !SKIP_REFRESH.some((u) => original.url?.includes(u));

    if (!shouldRefresh) throw error;

    original._retry = true;
    try {
      refreshPromise ??= api.post("/auth/refresh").finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      return api(original);
    } catch (refreshError) {
      onSessionExpired();
      throw refreshError;
    }
  },
);

// Small helpers that unwrap the { success, message, data } envelope
export const request = {
  get: async <T>(url: string, params?: object) => (await api.get<ApiSuccess<T>>(url, { params })).data,
  post: async <T>(url: string, body?: unknown) => (await api.post<ApiSuccess<T>>(url, body)).data,
  patch: async <T>(url: string, body?: unknown) => (await api.patch<ApiSuccess<T>>(url, body)).data,
  blob: async (url: string) => (await api.get<Blob>(url, { responseType: "blob" })).data,
};

// Removes empty filter values so query strings stay clean
export const cleanParams = (params: object) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export default api;
