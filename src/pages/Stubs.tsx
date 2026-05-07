import { Car, BarChart3, FileSearch, Shield, Settings } from "lucide-react";
import { PageStub } from "@/components/PageStub";

export function Comprados() { return <PageStub title="Veículos Comprados" description="Lista de veículos adquiridos pelo grupo" icon={Car} />; }
export function Relatorios() { return <PageStub title="Relatórios" description="Exporte PDF, Excel e compartilhe via WhatsApp" icon={BarChart3} />; }
export function Auditoria() { return <PageStub title="Auditoria" description="Histórico completo de ações" icon={FileSearch} />; }
export function Logs() { return <PageStub title="Logs do Sistema" description="Eventos críticos e operacionais" icon={Shield} />; }
export function Configuracoes() { return <PageStub title="Configurações" description="Tema, integrações, sincronização e backups" icon={Settings} />; }
