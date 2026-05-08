import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Vendedor = {
  id: string;
  nome: string;
  empresa: string | null;
  ativo: boolean;
  ordem: number;
};

export function useVendedores(empresa?: string, somenteAtivos = true) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("vendedores").select("*").order("ordem").order("nome");
    if (somenteAtivos) q = q.eq("ativo", true);
    if (empresa) q = q.or(`empresa.eq.${empresa},empresa.is.null`);
    const { data } = await q;
    setVendedores((data as Vendedor[]) || []);
    setLoading(false);
  }, [empresa, somenteAtivos]);

  useEffect(() => { load(); }, [load]);

  return { vendedores, loading, reload: load };
}
