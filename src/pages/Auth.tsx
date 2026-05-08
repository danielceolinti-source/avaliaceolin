import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  RefreshCcw, 
  ChevronRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  LockKeyhole, 
  User as UserIcon 
} from "lucide-react";

export default function Auth() {
  const { user, loading: authLoading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  if (authLoading) return null;
  if (user) return <Navigate to="/" replace />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    
    // Converte usuário em e-mail interno para o Supabase Auth
    const email = username.includes("@") ? username : `${username}@avaliaceolin.sistema`;
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      toast.error("Falha na autenticação", { 
        description: error.message === "Invalid login credentials" 
          ? "Usuário ou senha incorretos." 
          : error.message 
      });
    } else {
      navigate("/");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0a0a0a] overflow-hidden font-sans antialiased">
      {/* 62% Section - Brand & Experience (Golden Ratio) */}
      <div className="md:flex-[1.618] relative hidden md:flex flex-col justify-between p-12 lg:p-20 overflow-hidden border-r border-white/5">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-transparent z-10" />
          <img 
            src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=2070&auto=format&fit=crop" 
            className="w-full h-full object-cover opacity-40 grayscale transition-all duration-[3000ms] scale-110"
            alt="Experience"
          />
        </div>

        <div className="relative z-20 flex flex-col h-full justify-between">
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top duration-700">
             <img src="/logos/ceolin_login.png" alt="Ceolin" className="h-12 w-auto object-contain brightness-0 invert" />
             <div className="h-8 w-[1px] bg-white/20 mx-2" />
             <span className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-light">Avaliação de Seminovos</span>
          </div>

          <div className="max-w-xl animate-in fade-in slide-in-from-left duration-1000 delay-300">
            <h1 className="text-white text-6xl lg:text-7xl font-display font-bold leading-[0.9] tracking-tighter">
              AVALIAÇÃO <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CE2B37] to-white/40">PROFISSIONAL.</span>
            </h1>
            <p className="text-white/50 mt-8 text-lg font-light leading-relaxed max-w-sm">
              Avaliação inteligente, decisões mais rápidas, resultados superiores.
            </p>
          </div>

          <div className="flex items-center gap-8 text-white/30 text-[10px] uppercase tracking-[0.2em] font-medium">
            <span>© 2026 GRUPO CEOLIN</span>
            <div className="h-1 w-1 rounded-full bg-white/20" />
            <span>SISTEMA DE AUDITORIA TÉCNICA</span>
          </div>
        </div>
      </div>

      {/* 38% Section - Login Form (Golden Ratio) */}
      <div className="md:flex-1 flex items-center justify-center p-8 lg:p-16 bg-[#fafafa] relative overflow-hidden">
        {/* Mobile Logo Only */}
        <div className="md:hidden absolute top-12 left-1/2 -translate-x-1/2">
          <img src="/logos/ceolin_login.png" alt="Ceolin" className="h-10 w-auto object-contain" />
        </div>

        <div className="w-full max-w-[360px] animate-in fade-in slide-in-from-bottom duration-1000 delay-500">
          <div className="mb-12 text-center md:text-left">
            <h2 className="text-3xl font-display font-bold tracking-tight text-[#1a1a1a]">Acesso ao Sistema</h2>
            <p className="text-muted-foreground mt-2 font-light">Identifique-se para gerenciar avaliações.</p>
          </div>

          <form onSubmit={signIn} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/80">Usuário Corporativo</Label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input 
                  placeholder="ex: pedro.silva"
                  className="h-14 pl-12 bg-white border-slate-200 focus:ring-[#CE2B37] focus:border-[#CE2B37] transition-all rounded-xl"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/80">Senha</Label>
              </div>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  className="h-14 pl-12 pr-12 bg-white border-slate-200 focus:ring-[#CE2B37] focus:border-[#CE2B37] transition-all rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#CE2B37] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-[#1a1a1a] hover:bg-[#CE2B37] text-white font-bold uppercase tracking-widest text-xs transition-all duration-500 rounded-xl shadow-xl shadow-black/5 group"
              disabled={busy}
            >
              {busy ? (
                <RefreshCcw className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Entrar no Painel
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-200/60 flex flex-col gap-4">
             <div className="flex items-center gap-2 text-muted-foreground/40">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[9px] uppercase tracking-widest font-medium">Conexão Segura AES-256</span>
             </div>
             <p className="text-[10px] text-muted-foreground leading-relaxed">
               Acesso exclusivo a funcionários autorizados. O uso indevido está sujeito a monitoramento e auditoria.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
