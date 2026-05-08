import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "super_admin" | "ti" | "gestor" | "avaliador";

export function useRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRoles([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setRoles((data || []).map((r: any) => r.role));
      setLoading(false);
    })();
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
    if (isGestor) return true; // Gestor pode editar avaliações operacionais (todas)
    if (isAvaliador && user?.id === createdBy) return true; // Avaliador edita as próprias
    return false;
  };

  const canCreateAssessment = isAvaliador || isGestor || isTI || isSuperAdmin;

  return { 
    roles, 
    loading,
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
