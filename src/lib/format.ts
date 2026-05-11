// Formatação consistente em UTC-3 (America/Sao_Paulo)
const TZ = "America/Sao_Paulo";

/**
 * Converte uma string de data para Date corrigindo o bug de timezone.
 * Strings no formato "YYYY-MM-DD" (sem hora) são interpretadas pelo JS como
 * UTC midnight, o que na América/São_Paulo (UTC-3) mostra como o dia anterior.
 * Esta função força a interpretação como meio-dia UTC para evitar isso.
 */
const parseDate = (d: string | Date): Date => {
  if (d instanceof Date) return d;
  // String date-only "YYYY-MM-DD" → adiciona T12:00:00 para evitar flip de dia por timezone
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(d + "T12:00:00");
  }
  // Strings com timestamp completo ou formato ISO → comportamento padrão
  return new Date(d);
};

export const dataBR = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return parseDate(d).toLocaleDateString("pt-BR", { timeZone: TZ });
};

export const dataHoraBR = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return parseDate(d).toLocaleString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
};

export const moedaBR = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Hoje em UTC-3 no formato YYYY-MM-DD (para inputs date)
export const hojeBR = () => {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(new Date());
};

/**
 * Converte string de data para Date de forma segura (exportada para uso externo).
 * Resolve o bug de "um dia antes" em comparações de mês/ano.
 */
export { parseDate };
