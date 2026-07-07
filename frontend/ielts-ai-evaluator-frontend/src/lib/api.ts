import axiosInstance from "@/lib/axiosInstance";
import { auth } from "@/lib/firebase";
import { AxiosError } from "axios";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(method: string, url: string, data?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  try {
    const res = await axiosInstance.request<T>({
      method,
      url,
      data,
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (e) {
    const ax = e as AxiosError<{ message?: string }>;
    const status = ax.response?.status ?? 0;
    const message = ax.response?.data?.message ?? ax.message ?? "Request failed";
    throw new ApiError(status, message);
  }
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body),
  delete: <T>(url: string) => request<T>("DELETE", url),
};
