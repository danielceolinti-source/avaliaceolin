export type Empresa = "Ceolin" | "Viva";

export const EMPRESAS: { id: Empresa; nome: string; marcas: string[] }[] = [
  { id: "Ceolin", nome: "Ceolin Automóveis", marcas: ["Fiat"] },
  { id: "Viva", nome: "Viva Automóveis", marcas: ["Jeep", "Ram"] },
];

export const VENDEDORES: Record<Empresa, string[]> = {
  Ceolin: ["Carminha", "Lucas", "Iure", "Fabiana", "Leonardo", "Andre (Avaliador)", "Adelmo (Avaliador)"],
  Viva: ["Natiele", "Adinoel", "Luiz", "Fernanda", "João Vitor"],
};

export const ORIGENS = ["WhatsApp", "Presencial"] as const;
export type Origem = (typeof ORIGENS)[number];

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

export const STATUS_COLORS: Record<Status, string> = {
  "Em Avaliação": "bg-info/15 text-info border-info/30",
  Finalizada: "bg-muted text-foreground border-border",
  Comprado: "bg-success/15 text-success border-success/30",
  "Não Comprado": "bg-destructive/15 text-destructive border-destructive/30",
  Cancelado: "bg-muted text-muted-foreground border-border",
};
