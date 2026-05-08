export type Empresa = "Ceolin" | "Viva";

export const EMPRESAS: { id: Empresa; nome: string; marcas: string[] }[] = [
  { id: "Ceolin", nome: "Ceolin Automóveis", marcas: ["Fiat"] },
  { id: "Viva", nome: "Viva Automóveis", marcas: ["Jeep", "Ram"] },
];

// Vendedores reais identificados na planilha CONTROLE DE AVALIAÇÃO 2026
export const VENDEDORES_PADRAO = [
  "Leonardo",
  "Fernanda",
  "André",
  "Natiele",
  "Iury",
  "Carminha",
  "Luiz Henrique",
  "Adelmo",
  "Adinoel",
  "Lucas",
  "Iure",
  "Fabiana",
  "Luiz",
  "João Vitor",
] as const;

export const VENDEDORES: Record<Empresa, string[]> = {
  Ceolin: ["Carminha", "Lucas", "Iure", "Fabiana", "Leonardo", "André", "Adelmo"],
  Viva: ["Natiele", "Adinoel", "Luiz Henrique", "Fernanda", "João Vitor", "Iury"],
};

export const ORIGENS = ["WhatsApp", "Presencial", "Indicação", "Anúncio"] as const;
export type Origem = (typeof ORIGENS)[number];

// Modalidade da avaliação (planilha: coluna FOTO/PRESENCIAL)
export const MODALIDADES = ["PRESENCIAL", "FOTOS"] as const;
export type Modalidade = (typeof MODALIDADES)[number];

export const STATUS = [
  "Em Avaliação",
  "Finalizada",
  "Comprado",
  "Não Comprado",
  "Cancelado",
] as const;
export type Status = (typeof STATUS)[number];

export const ESTADO_GERAL = ["Excelente", "Muito Bom", "Bom", "Regular", "Ruim"] as const;
export const NIVEL_AVARIAS = ["Sem avarias", "Leve", "Moderado", "Alto", "Grave"] as const;

export const HISTORICO_OPCOES = [
  "Único dono",
  "Revisões em dia",
  "Sem sinistro registrado",
  "Ainda com garantia de fábrica",
  "Manual e chave reserva",
  "Histórico em concessionária",
];

export const OPCIONAIS = [
  "Ar-condicionado", "Direção elétrica", "Direção hidráulica", "Vidros elétricos",
  "Travas elétricas", "Airbag", "Freios ABS", "Multimídia", "Sensor de ré",
  "Câmera de ré", "Rodas liga leve", "Bancos de couro", "Teto solar", "Piloto automático",
];

// Tags rápidas extraídas das observações reais da planilha
export const TAGS_OBS = [
  "IPVA pago",
  "IPVA não pago",
  "Receber IPVA pago",
  "Funilaria",
  "Pintura",
  "Cotas a pagar",
  "Emplacado 2026",
  "Não emplacado",
  "Tributação",
  "Opção pelo 0KM",
  "Único dono",
  "Sinistro",
] as const;

export const STATUS_COLORS: Record<Status, string> = {
  "Em Avaliação": "bg-info/15 text-info border-info/30",
  Finalizada: "bg-muted text-foreground border-border",
  Comprado: "bg-success/15 text-success border-success/30",
  "Não Comprado": "bg-destructive/15 text-destructive border-destructive/30",
  Cancelado: "bg-muted text-muted-foreground border-border",
};

// Meses operacionais (planilha tem aba por mês de Maio a Dezembro/2026)
export const MESES = [
  { num: 1, nome: "Janeiro", abrev: "JAN" },
  { num: 2, nome: "Fevereiro", abrev: "FEV" },
  { num: 3, nome: "Março", abrev: "MAR" },
  { num: 4, nome: "Abril", abrev: "ABR" },
  { num: 5, nome: "Maio", abrev: "MAI" },
  { num: 6, nome: "Junho", abrev: "JUN" },
  { num: 7, nome: "Julho", abrev: "JUL" },
  { num: 8, nome: "Agosto", abrev: "AGO" },
  { num: 9, nome: "Setembro", abrev: "SET" },
  { num: 10, nome: "Outubro", abrev: "OUT" },
  { num: 11, nome: "Novembro", abrev: "NOV" },
  { num: 12, nome: "Dezembro", abrev: "DEZ" },
];
