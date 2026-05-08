import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Car, Loader2, Eye, EyeOff, LockKeyhole, User as UserIcon } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    
    // Converte usuário em e-mail interno para o Supabase Auth
    // O usuário não precisa saber que existe um e-mail por trás
    const email = username.includes("@") ? username : `${username}@avaliaceolin.sistema`;
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    setBusy(false);
    if (error) {
      if (error.message === "Invalid login credentials") {
        toast.error("Usuário ou senha incorretos");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Bem-vindo");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-hero">
      <div className="hidden md:flex flex-1 flex-col justify-between p-10 text-white">
        <div className="flex items-center gap-3">
          <img src="/logos/ceolin_login.png" alt="Ceolin" className="h-28 w-auto object-contain" />
        </div>
        <div>
          <h1 className="font-display text-5xl font-bold leading-tight">Avaliação de seminovos<br/>com velocidade premium.</h1>
          <p className="text-white/70 mt-4 max-w-md">Plataforma corporativa para Ceolin Automóveis e Viva Automóveis. Foco em produtividade, controle e experiência no pátio.</p>
        </div>
        <div className="text-xs text-white/40">© Grupo Ceolin · Sistema interno</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50/50">
        <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-primary w-full" />
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-8 mb-10 pt-4">
              <img src="/logos/ceolin_login.png" alt="Ceolin" className="h-28 w-auto object-contain" />
              <div className="text-center">
                <h2 className="font-display text-xl font-bold tracking-tight">Acesso Restrito</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Identifique-se para continuar</p>
              </div>
            </div>

            <form onSubmit={signIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="username"
                    autoComplete="username"
                    required 
                    placeholder="Seu login corporativo"
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    className="pl-10 h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                </div>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password"
                    type={showPassword ? "text" : "password"} 
                    autoComplete="current-password"
                    required 
                    placeholder="••••••••"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="pl-10 pr-10 h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe} 
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)} 
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Lembrar minha sessão
                </label>
              </div>

              <Button disabled={busy} className="w-full bg-gradient-primary text-primary-foreground shadow-lg shadow-primary/20 h-12 text-base font-semibold mt-2">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar no Sistema"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-center text-xs text-muted-foreground">
                Problemas com seu acesso? Contate o departamento de T.I.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
