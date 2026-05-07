import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
