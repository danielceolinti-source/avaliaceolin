import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withTimeout } from "@/lib/utils-timeout";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async (u: User) => {
    try {
      const { data: profile } = await withTimeout(
        supabase
          .from("profiles")
          .select("ativo")
          .eq("user_id", u.id)
          .single()
      );
      
      if (profile && profile.ativo === false) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        toast.error("Sua conta foi desativada. Entre em contato com o administrador.");
        return false;
      }
      return true;
    } catch (err) {
      console.error("Erro ao verificar status do usuário:", err);
      return true; // Falha no check não deve necessariamente bloquear o boot, mas o ProtectedRoute cuidará do timeout global
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      // Apenas verifica status em eventos de login real (não em refresh/tab focus)
      if (s?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setTimeout(() => { checkStatus(s.user); }, 0);
      }
    });

    const initSession = async () => {
      try {
        const { data, error: sessionError } = await withTimeout(supabase.auth.getSession(), 8000);
        if (sessionError) throw sessionError;
        if (!mounted) return;

        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
      } catch (err: any) {
        console.error("Falha ao inicializar sessão:", err);
        if (mounted) setError(err.message === "TIMEOUT_EXCEEDED" ? "Tempo de resposta excedido" : "Erro de conexão com servidor");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear(); // Limpa cache local conforme requisito 5
      window.location.assign("/auth");
    } catch (e) {
      window.location.assign("/auth");
    }
  };

  return { session, user, loading, error, signOut };
}
