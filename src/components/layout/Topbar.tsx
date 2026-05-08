import { Search, Moon, Sun, Wifi, WifiOff, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/store/app";
import { EMPRESAS } from "@/data/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function Topbar() {
  const { empresaFiltro, setEmpresaFiltro, dark, toggleDark, setTheme } = useApp();
  const [online, setOnline] = useState(navigator.onLine);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = ((user?.user_metadata?.full_name as string) || user?.email || "U")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const logoSrc = empresaFiltro === "Ceolin" 
    ? "/logos/ceolin.png" 
    : empresaFiltro === "Viva" 
    ? "/logos/viva.png" 
    : "/logos/grupo.png";

  return (
    <div className="flex flex-1 items-center gap-2 md:gap-3">
      {/* Dynamic Logo Container */}
      <div className="h-10 px-4 flex items-center bg-white rounded border mr-2 md:mr-3 shadow-sm">
        <img 
          src={logoSrc} 
          alt={empresaFiltro} 
          className="h-8 w-auto object-contain"
          onError={(e) => {
            // Fallback se a imagem não existir
            (e.target as any).src = "https://placehold.co/120x40?text=LOGO";
          }}
        />
      </div>

      <div className="relative flex-1 max-w-xl hidden lg:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar placa, chassi, vendedor, modelo…" className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background" />
      </div>

      <div className="flex-1 lg:hidden" />

      <Select
        value={empresaFiltro}
        onValueChange={(v) => {
          setEmpresaFiltro(v as any);
          setTheme(v === "Viva" ? "viva" : "fiat");
        }}
      >
        <SelectTrigger className="h-9 w-[130px] md:w-[170px] bg-white border-primary/20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todas">Todas empresas</SelectItem>
          {EMPRESAS.map((e) => (
            <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Badge variant="outline" className={`gap-1 hidden sm:inline-flex ${online ? "text-success border-success/40" : "text-warning border-warning/40"}`}>
        {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {online ? "Online" : "Offline"}
      </Badge>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:flex">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleDark}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={async () => { await signOut(); navigate("/auth"); }}
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="h-9 w-9 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-semibold text-sm shadow-glow overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
        {(user?.user_metadata as any)?.avatar_url ? (
          <img src={(user.user_metadata as any).avatar_url} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
    </div>
  );
}
