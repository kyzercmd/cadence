import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isPast, parseISO, startOfWeek } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr || dateStr.startsWith("0001-01-01")) return null;
  const d = parseISO(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function safeFormat(dateStr: string | undefined | null, fmt: string, fallback = "—"): string {
  const d = safeDate(dateStr);
  return d ? format(d, fmt) : fallback;
}

export function isOverdue(dateStr: string | undefined | null): boolean {
  const d = safeDate(dateStr);
  return d ? isPast(d) : false;
}

export function formatDateForApi(dateStr: string | undefined | null): string | undefined {
  if (!dateStr || dateStr.startsWith("0001-01-01")) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return `${dateStr}T00:00:00Z`;
  }
  return dateStr;
}
export function formatDateForInput(dateStr: string | undefined | null): string {
  if (!dateStr || dateStr.startsWith("0001-01-01")) return "";
  const d = safeDate(dateStr);
  return d ? format(d, "yyyy-MM-dd") : (dateStr.slice(0, 10) || "");
}

export function normalizeExternalUrl(url: string | undefined | null): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

