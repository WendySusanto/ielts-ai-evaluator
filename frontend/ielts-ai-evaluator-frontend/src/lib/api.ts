import { auth } from "@/lib/firebase";

// Trailing slash trimmed so "https://host/" + "/api/me" can't become "https://host//api/me".
const baseURL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:7071").replace(/\/+$/, "");

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
  let res: Response;
  try {
    res = await fetch(baseURL + url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch (e) {
    // Never reached the server: offline, DNS, CORS.
    throw new ApiError(0, (e as Error).message);
  }
  if (!res.ok) {
    // The API answers with { message }; a gateway in front of it may answer with HTML.
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.message ?? `Request failed with status code ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body),
  delete: <T>(url: string) => request<T>("DELETE", url),
};
