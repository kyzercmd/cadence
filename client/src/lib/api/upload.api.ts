// File upload helper. Uses POST /api/upload with FormData against the real
// backend, and a FileReader data URL fallback when running against the mock.
import { getAuthToken } from "./client";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK as string | undefined) !== "false" && !BASE_URL;

export interface UploadResponse {
  url: string;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export const uploadApi = {
  async upload(file: File): Promise<UploadResponse> {
    if (USE_MOCK) {
      // Simulate a small delay + return a data URL as the "hosted" URL.
      await new Promise((r) => setTimeout(r, 150));
      return { url: await readAsDataUrl(file) };
    }
    const token = getAuthToken();
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(new URL("/api/upload", BASE_URL).toString(), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(text || `Upload failed: ${res.status}`);
    }
    return (await res.json()) as UploadResponse;
  },
};
