import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async (u: User) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("ativo")
      .eq("user_id", u.id)
      .single();
    
    if (profile && profile.ativo === false) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      toast.error("Sua conta foi desativada. Entre em contato com o administrador.");
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await checkStatus(s.user);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) checkStatus(data.session.user);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading, signOut: () => supabase.auth.signOut() };
}
