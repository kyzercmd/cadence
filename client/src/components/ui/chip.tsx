import { cn } from "@/lib/utils";

export type ChipTone = "primary" | "success" | "warning" | "destructive" | "info" | "purple" | "muted";

const STYLES: Record<ChipTone, string> = {
  primary:     "bg-primary/15 text-primary ring-1 ring-primary/30",
  success:     "bg-success/15 text-success ring-1 ring-success/30",
  warning:     "bg-warning/15 text-warning ring-1 ring-warning/30",
  destructive: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
  info:        "bg-info/15 text-info ring-1 ring-info/30",
  purple:      "bg-purple/15 text-purple ring-1 ring-purple/30",
  muted:       "bg-muted text-muted-foreground ring-1 ring-border",
};

export function Chip({
  tone = "muted",
  className,
  children,
}: {
  tone?: ChipTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function priorityTone(p: "low" | "medium" | "high"): ChipTone {
  return p === "high" ? "destructive" : p === "medium" ? "warning" : "success";
}

export function levelTone(level: "Junior" | "Middle" | "Senior"): ChipTone {
  return level === "Senior" ? "success" : level === "Middle" ? "info" : "muted";
}

export function statusTone(s: "todo" | "in_progress" | "in_review" | "done"): ChipTone {
  return s === "done" ? "success" : s === "in_progress" ? "info" : s === "in_review" ? "purple" : "muted";
}

export function statusLabel(s: "todo" | "in_progress" | "in_review" | "done"): string {
  return s === "todo" ? "To Do" : s === "in_progress" ? "In Progress" : s === "in_review" ? "In Review" : "Done";
}
