import { FileSearch, Shield } from "lucide-react";
import { PageStub } from "@/components/PageStub";

export function Auditoria() { return <PageStub title="Auditoria" description="Histórico completo de ações" icon={FileSearch} />; }
export function Logs() { return <PageStub title="Logs do Sistema" description="Eventos críticos e operacionais" icon={Shield} />; }
