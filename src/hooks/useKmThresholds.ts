import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KmThresholds {
  yellowThreshold: number;
  redThreshold: number;
  yellowText: string;
  redText: string;
  isLoading: boolean;
}

const DEFAULTS = {
  yellowThreshold: 80000,
  redThreshold: 100000,
  yellowText: "⚠️ Atenção: veículo com quilometragem elevada. Verifique o estado de conservação.",
  redText: "🔴 Alto Risco: quilometragem muito alta. Avalie com critério rigoroso e considere deságio máximo.",
};

export function useKmThresholds(): KmThresholds {
  const { data, isLoading } = useQuery({
    queryKey: ["km-thresholds"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_settings")
        .select("key, value")
        .in("key", [
          "km_threshold_yellow",
          "km_threshold_red",
          "km_alert_yellow_text",
          "km_alert_red_text",
        ]);
      if (error) throw error;
      const map = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
      return {
        yellowThreshold: parseInt(map.km_threshold_yellow ?? `${DEFAULTS.yellowThreshold}`),
        redThreshold: parseInt(map.km_threshold_red ?? `${DEFAULTS.redThreshold}`),
        yellowText: map.km_alert_yellow_text ?? DEFAULTS.yellowText,
        redText: map.km_alert_red_text ?? DEFAULTS.redText,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    yellowThreshold: data?.yellowThreshold ?? DEFAULTS.yellowThreshold,
    redThreshold: data?.redThreshold ?? DEFAULTS.redThreshold,
    yellowText: data?.yellowText ?? DEFAULTS.yellowText,
    redText: data?.redText ?? DEFAULTS.redText,
    isLoading,
  };
}

export type KmVariant = "green" | "yellow" | "red";

export function getKmBadgeVariant(km: number, yellow: number, red: number): KmVariant {
  if (!km || km <= yellow) return "green";
  if (km <= red) return "yellow";
  return "red";
}
