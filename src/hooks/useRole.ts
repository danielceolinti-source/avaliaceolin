import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { withTimeout } from "@/lib/utils-timeout";

export type AppRole = "super_admin" | "ti" | "gestor" | "avaliador";

export function useRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!user) { 
      setRoles([]); 
      setLoading(false); 
      return; 
    }
    
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await withTimeout(
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          8000
        );
        if (mounted) {
          setRoles((data || []).map((r: any) => r.role));
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

  // Granular Permissions
  const isAdmin = isSuperAdmin || isTI || isGestor;
  const canManageRoles = isSuperAdmin || isTI;
  const canManageUsers = isSuperAdmin || isTI;
  const canManageVendors = isSuperAdmin || isTI;
  const canViewDashboards = isSuperAdmin || isTI || isGestor;
  const canViewAudit = isSuperAdmin;
  const canDeleteAny = isSuperAdmin;
  const canRestoreData = isSuperAdmin;

  const canEditAssessment = (createdBy: string | null) => {
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
    isAdmin, 
    canManageRoles, 
    canManageUsers,
    canManageVendors,
    canViewDashboards,
    canViewAudit,
    canDeleteAny,
    canRestoreData,
    canEditAssessment,
    canCreateAssessment
  };
}
