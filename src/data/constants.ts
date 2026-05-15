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

// ═══════════════════════════════════════════════════════
// SISTEMA DE STATUS EM DUAS CAMADAS
// ═══════════════════════════════════════════════════════

// Camada 1 — Status da Avaliação (fluxo do avaliador)
export const STATUS_AVALIACAO = ["Em Avaliação", "Avaliado"] as const;
export type StatusAvaliacao = (typeof STATUS_AVALIACAO)[number];

// Camada 2 — Status de Negociação/Compra (fluxo do gestor)
export const STATUS_NEGOCIACAO = [
  "Sem definição",
  "Em negociação",
  "Aguardando retorno",
  "Comprado",
  "Não comprado",
  "Arquivado",
] as const;
export type StatusNegociacao = (typeof STATUS_NEGOCIACAO)[number];

// Todos os status possíveis (para backward compat e filtros)
export const STATUS = [
  ...STATUS_AVALIACAO,
  ...STATUS_NEGOCIACAO,
] as const;
export type Status = StatusAvaliacao | StatusNegociacao;

// Legacy status mapping (para dados antigos)
export const LEGACY_STATUS_MAP: Record<string, { status: StatusAvaliacao; negociacao: StatusNegociacao }> = {
  "Finalizada": { status: "Avaliado", negociacao: "Sem definição" },
  "Cancelado": { status: "Avaliado", negociacao: "Arquivado" },
};

export const ESTADO_GERAL = ["Excelente", "Bom", "Regular", "Ruim", "Muito Ruim"] as const;
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

// Tags rápidas (mantidas para leitura de dados antigos, não usadas em novos formulários)
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

// Cores visuais por status — ambas as camadas
export const STATUS_COLORS: Record<string, string> = {
  // Camada 1
  "Em Avaliação": "bg-warning/15 text-warning border-warning/30",
  "Avaliado": "bg-info/15 text-info border-info/30",
  // Camada 2
  "Sem definição": "bg-muted text-muted-foreground border-border",
  "Em negociação": "bg-amber-500/15 text-amber-600 border-amber-500/30",
  "Aguardando retorno": "bg-purple-500/15 text-purple-600 border-purple-500/30",
  "Comprado": "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  "Não comprado": "bg-destructive/15 text-destructive border-destructive/30",
  "Arquivado": "bg-slate-500/15 text-slate-500 border-slate-500/30",
  // Legacy
  "Finalizada": "bg-info/15 text-info border-info/30",
  "Cancelado": "bg-muted text-muted-foreground border-border",
};

// Dot colors for pulse indicators
export const STATUS_DOT: Record<string, string> = {
  "Em Avaliação": "bg-warning",
  "Avaliado": "bg-info",
  "Sem definição": "bg-muted-foreground",
  "Em negociação": "bg-amber-500",
  "Aguardando retorno": "bg-purple-500",
  "Comprado": "bg-emerald-500",
  "Não comprado": "bg-destructive",
  "Arquivado": "bg-slate-500",
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
