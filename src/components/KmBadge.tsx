import { useKmThresholds, getKmBadgeVariant } from "@/hooks/useKmThresholds";
import { cn } from "@/lib/utils";

interface KmBadgeProps {
  km?: number | null;
  className?: string;
}

const VARIANT_CLASSES: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30",
  red: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
};

export default function KmBadge({ km, className }: KmBadgeProps) {
  const { yellowThreshold, redThreshold } = useKmThresholds();
  if (km === null || km === undefined || isNaN(Number(km))) {
    return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  }
  const variant = getKmBadgeVariant(Number(km), yellowThreshold, redThreshold);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {Number(km).toLocaleString("pt-BR")} km
    </span>
  );
}
