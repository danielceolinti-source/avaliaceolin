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

  const isAdmin = roles.some((r) => ["super_admin", "ti", "gestor"].includes(r));
  const isSuperAdmin = roles.includes("super_admin");
  const canManageRoles = roles.some((r) => ["super_admin", "ti"].includes(r));

  return { roles, isAdmin, isSuperAdmin, canManageRoles, loading };
}
