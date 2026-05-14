import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { withTimeout } from "@/lib/utils-timeout";

export type AppRole = "super_admin" | "ti" | "gestor" | "avaliador" | "vendedor";

type RoleRow = { role: AppRole; vendedor_id: string | null };

export function useRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [vendedorVinculadoId, setVendedorVinculadoId] = useState<string | null>(null);
  const [vendedorVinculadoNome, setVendedorVinculadoNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setRoles([]);
      setVendedorVinculadoId(null);
      setVendedorVinculadoNome(null);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await withTimeout(
          (supabase.from("user_roles") as any).select("role, vendedor_id").eq("user_id", user.id),
          8000
        );
        if (!mounted) return;
        const rows = (data || []) as RoleRow[];
        setRoles(rows.map((r) => r.role));
        const vendRow = rows.find((r) => r.role === "vendedor" && r.vendedor_id);
        setVendedorVinculadoId(vendRow?.vendedor_id || null);

        if (vendRow?.vendedor_id) {
          const { data: v } = await supabase
            .from("vendedores")
            .select("nome")
            .eq("id", vendRow.vendedor_id)
            .maybeSingle();
          if (mounted) setVendedorVinculadoNome((v as any)?.nome || null);
        } else {
          setVendedorVinculadoNome(null);
        }
      } catch (err: any) {
        console.error("Erro ao carregar roles:", err);
        if (mounted) setError(err.message === "TIMEOUT_EXCEEDED" ? "Tempo de resposta excedido (Roles)" : "Erro ao carregar permissões");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [user]);

  const isSuperAdmin = roles.includes("super_admin");
  const isTI = roles.includes("ti");
  const isGestor = roles.includes("gestor");
  const isAvaliador = roles.includes("avaliador");
  const isVendedor = roles.includes("vendedor");

  const isAdmin = isSuperAdmin || isTI || isGestor;
  const canManageRoles = isSuperAdmin || isTI;
  const canManageUsers = isSuperAdmin || isTI;
  const canManageVendors = isSuperAdmin || isTI;
  const canViewDashboards = !isAvaliador && !isVendedor;
  const canViewStrategic = canViewDashboards;
  const canViewAudit = isSuperAdmin;
  const canDeleteAny = isSuperAdmin;
  const canRestoreData = isSuperAdmin;

  const canEditAssessment = (createdBy: string | null) => {
    if (isVendedor) return false; // vendedor é somente visualização
    if (isSuperAdmin || isTI) return true;
    if (isGestor) return true;
    if (isAvaliador && user?.id === createdBy) return true;
    return false;
  };

  const canCreateAssessment = isAvaliador || isGestor || isTI || isSuperAdmin;

  return {
    roles,
    loading,
    error,
    isSuperAdmin,
    isTI,
    isGestor,
    isAvaliador,
    isVendedor,
    vendedorVinculadoId,
    vendedorVinculadoNome,
    isAdmin,
    canManageRoles,
    canManageUsers,
    canManageVendors,
    canViewDashboards,
    canViewStrategic,
    canViewAudit,
    canDeleteAny,
    canRestoreData,
    canEditAssessment,
    canCreateAssessment,
  };
}
