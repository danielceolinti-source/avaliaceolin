import { useState } from "react";
import { useKmThresholds, getKmBadgeVariant } from "@/hooks/useKmThresholds";
import { ChevronDown, ChevronUp, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  km?: number | null;
  className?: string;
}

export default function KmAlertBanner({ km, className }: Props) {
  const { yellowThreshold, redThreshold, yellowText, redText } = useKmThresholds();
  const [collapsed, setCollapsed] = useState(false);

  if (km === null || km === undefined || isNaN(Number(km))) return null;
  const variant = getKmBadgeVariant(Number(km), yellowThreshold, redThreshold);
  if (variant === "green") return null;

  const isRed = variant === "red";
  const text = isRed ? redText : yellowText;
  const Icon = isRed ? AlertCircle : AlertTriangle;
  const palette = isRed
    ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300"
    : "bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-500/10 dark:border-yellow-500/30 dark:text-yellow-200";

  return (
    <div className={cn("rounded-lg border p-3 flex items-start gap-3 shadow-sm", palette, className)}>
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", isRed ? "text-red-600" : "text-yellow-600")} />
      <div className="flex-1 min-w-0 text-sm">
        <div className="font-semibold">
          Veículo com {Number(km).toLocaleString("pt-BR")} km
        </div>
        {!collapsed && (
          <p className="mt-1 leading-snug text-sm opacity-95">{text}</p>
        )}
      </div>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5 transition"
        aria-label={collapsed ? "Expandir" : "Recolher"}
      >
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
    </div>
  );
}
