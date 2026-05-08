import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Loader2, AlertCircle, RefreshCw, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export default function ProtectedRoute() {
  const { user, loading: authLoading, error: authError, signOut } = useAuth();
  const { loading: roleLoading, error: roleError } = useRole();
  const [timedOut, setTimedOut] = useState(false);

  // Requirement 2: Fallback de Loading (Timeout de 10s)
  useEffect(() => {
    let timer: any;
    if (authLoading || roleLoading) {
      timer = setTimeout(() => {
        setTimedOut(true);
      }, 10000);
    } else {
      setTimedOut(false);
    }
    return () => clearTimeout(timer);
  }, [authLoading, roleLoading]);

  // Se houver erro explícito ou timeout
  if (authError || roleError || timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full grid place-items-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Falha no Carregamento</h2>
          <p className="text-muted-foreground mb-8">
            {authError || roleError || "O sistema está demorando mais do que o esperado para responder."}
          </p>
          
          <div className="grid gap-3">
            <Button onClick={() => window.location.reload()} className="w-full bg-gradient-primary">
              <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
            </Button>
            <Button variant="outline" onClick={signOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" /> Voltar ao Login
            </Button>
          </div>
          
          <p className="mt-8 text-xs text-muted-foreground">
            Se o problema persistir, verifique sua conexão ou contate o T.I.
          </p>
        </div>
      </div>
    );
  }

  // Requirement 6: Ordem fixa de Boot
  // 1. Verificar Autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground animate-pulse">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // 2. Carregar Usuário / 3. Carregar Permissões
  if (roleLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground animate-pulse">Carregando permissões...</p>
        </div>
      </div>
    );
  }

  // 4. Liberar Dashboard (Outlet)
  return <Outlet />;
}
