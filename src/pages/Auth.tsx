import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Car, Loader2 } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Bem-vindo"); navigate("/"); }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Conta criada", { description: "Verifique seu e-mail para confirmar." });
  };

  const signInGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Falha no login Google"); setBusy(false); return; }
    if (result.redirected) return;
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-gradient-hero">
      <div className="hidden md:flex flex-1 flex-col justify-between p-10 text-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-gradient-primary grid place-items-center font-display font-bold shadow-glow">C</div>
          <div>
            <div className="font-display font-bold text-lg">Avalia Ceolin</div>
            <div className="text-xs uppercase tracking-widest text-white/60">Grupo Ceolin</div>
          </div>
        </div>
        <div>
          <h1 className="font-display text-5xl font-bold leading-tight">Avaliação de seminovos<br/>com velocidade premium.</h1>
          <p className="text-white/70 mt-4 max-w-md">Plataforma corporativa para Ceolin Automóveis e Viva Automóveis. Foco em produtividade, controle e experiência no pátio.</p>
        </div>
        <div className="text-xs text-white/40">© Grupo Ceolin · Sistema interno</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-7">
            <div className="flex md:hidden items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-md bg-gradient-primary grid place-items-center text-primary-foreground font-bold">C</div>
              <div className="font-display font-bold">Avalia Ceolin</div>
            </div>
            <h2 className="font-display text-2xl font-bold flex items-center gap-2"><Car className="h-5 w-5 text-primary" /> Acesso ao sistema</h2>
            <p className="text-sm text-muted-foreground mt-1">Entre com sua conta corporativa.</p>

            <Tabs defaultValue="login" className="mt-6">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={signIn} className="space-y-3 mt-4">
                  <div><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
                  <div><Label>Senha</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" /></div>
                  <Button disabled={busy} className="w-full bg-gradient-primary text-primary-foreground shadow-glow h-11">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-3 mt-4">
                  <div><Label>Nome completo</Label><Input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
                  <div><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
                  <div><Label>Senha</Label><Input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" /></div>
                  <Button disabled={busy} className="w-full bg-gradient-primary text-primary-foreground shadow-glow h-11">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-widest"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
            </div>

            <Button type="button" variant="outline" onClick={signInGoogle} disabled={busy} className="w-full h-11">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.97 10.97 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              Entrar com Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
