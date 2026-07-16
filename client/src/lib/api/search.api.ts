import { apiClient } from "./client";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  url: string;
}

export const searchApi = {
  global: (q: string) =>
    apiClient.get<SearchResult[]>("/api/search", { q }),
};
