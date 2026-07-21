// File upload helper. Uses POST /api/upload with FormData against the real
// backend.
import { getAuthToken } from "./client";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
export interface UploadResponse {
  url: string;
}

export const uploadApi = {
  async upload(file: File): Promise<UploadResponse> {
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
