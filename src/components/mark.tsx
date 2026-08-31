import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("text-accent", className)}
      aria-hidden="true"
    >
      <rect x="4" y="14" width="5" height="10" rx="0.8" fill="currentColor" opacity="0.55" />
      <rect x="6.1" y="10" width="0.8" height="18" fill="currentColor" opacity="0.55" />
      <rect x="13.5" y="8" width="5" height="14" rx="0.8" fill="currentColor" />
      <rect x="15.6" y="5" width="0.8" height="20" fill="currentColor" />
      <rect x="23" y="12" width="5" height="8" rx="0.8" fill="currentColor" opacity="0.7" />
      <rect x="25.1" y="9" width="0.8" height="14" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
