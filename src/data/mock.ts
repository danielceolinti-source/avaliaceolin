import { Empresa, Origem, Status } from "./constants";

export interface Avaliacao {
  id: string;
  numero: number;
  empresa: Empresa;
  placa: string;
  chassi?: string;
  marca: string;
  modelo: string;
  versao?: string;
  ano: string;
  km: number;
  fipe: number;
  custo: number;
  avaliacao: number;
  vendedor: string;
  avaliador: string;
  origem: Origem;
  status: Status;
  observacoes?: string;
  createdAt: string;
  fotos: number;
}

const NAMES_C = ["Carminha", "Lucas", "Iure", "Fabiana", "Leonardo"];
const NAMES_V = ["Natiele", "Adinoel", "Luiz", "Fernanda", "João Vitor"];
const AVAL = ["Andre", "Adelmo"];

const sample = [
  { marca: "Fiat", modelo: "Pulse", versao: "Drive 1.3", emp: "Ceolin" as Empresa },
  { marca: "Fiat", modelo: "Strada", versao: "Volcano 1.3", emp: "Ceolin" as Empresa },
  { marca: "Fiat", modelo: "Toro", versao: "Freedom 1.8", emp: "Ceolin" as Empresa },
  { marca: "Fiat", modelo: "Mobi", versao: "Like 1.0", emp: "Ceolin" as Empresa },
  { marca: "Fiat", modelo: "Argo", versao: "Drive 1.0", emp: "Ceolin" as Empresa },
  { marca: "Jeep", modelo: "Compass", versao: "Longitude T270", emp: "Viva" as Empresa },
  { marca: "Jeep", modelo: "Renegade", versao: "Sport 1.3 T", emp: "Viva" as Empresa },
  { marca: "Jeep", modelo: "Commander", versao: "Overland", emp: "Viva" as Empresa },
  { marca: "Ram", modelo: "Rampage", versao: "Rebel 2.0", emp: "Viva" as Empresa },
  { marca: "Ram", modelo: "1500", versao: "Laramie", emp: "Viva" as Empresa },
];

const STATUS_POOL: Status[] = ["Em Avaliação", "Finalizada", "Comprado", "Comprado", "Não Comprado", "Finalizada"];

function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function placa(i: number) {
  const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `${L[i % 26]}${L[(i * 3) % 26]}${L[(i * 7) % 26]}${(1000 + i).toString().slice(0, 1)}${L[(i * 5) % 26]}${(10 + (i % 90)).toString().padStart(2, "0")}`;
}

export const MOCK_AVALIACOES: Avaliacao[] = Array.from({ length: 48 }).map((_, i) => {
  const s = sample[i % sample.length];
  const fipe = 45000 + Math.round(Math.random() * 180000);
  const custo = Math.round(fipe * (0.05 + Math.random() * 0.08));
  const aval = Math.round(fipe * (0.78 + Math.random() * 0.12));
  const d = new Date();
  d.setHours(d.getHours() - i * 7);
  return {
    id: `AV-${1000 + i}`,
    numero: 1000 + i,
    empresa: s.emp,
    placa: placa(i),
    chassi: `9BD${Math.random().toString(36).slice(2, 16).toUpperCase()}`,
    marca: s.marca,
    modelo: s.modelo,
    versao: s.versao,
    ano: `${2018 + (i % 7)}/${2019 + (i % 7)}`,
    km: 8000 + Math.round(Math.random() * 90000),
    fipe,
    custo,
    avaliacao: aval,
    vendedor: s.emp === "Ceolin" ? rand(NAMES_C) : rand(NAMES_V),
    avaliador: rand(AVAL),
    origem: Math.random() > 0.45 ? "WhatsApp" : "Presencial",
    status: rand(STATUS_POOL),
    createdAt: d.toISOString(),
    fotos: Math.floor(Math.random() * 12),
  };
});
