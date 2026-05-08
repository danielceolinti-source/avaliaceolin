// Formatação consistente em UTC-3 (America/Sao_Paulo)
const TZ = "America/Sao_Paulo";

export const dataBR = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: TZ });
};

export const dataHoraBR = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
};

export const moedaBR = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Hoje em UTC-3 no formato YYYY-MM-DD (para inputs date)
export const hojeBR = () => {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(new Date());
};
