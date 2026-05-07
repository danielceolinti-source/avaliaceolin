import { Search, Moon, Sun, Wifi, WifiOff, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/store/app";
import { EMPRESAS } from "@/data/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export function Topbar() {
  const { empresaFiltro, setEmpresaFiltro, dark, toggleDark, setTheme } = useApp();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <div className="flex flex-1 items-center gap-2 md:gap-3">
      <div className="relative flex-1 max-w-xl hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar placa, chassi, vendedor, modelo…" className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background" />
      </div>

      <div className="flex-1 sm:hidden" />

      <Select
        value={empresaFiltro}
        onValueChange={(v) => {
          setEmpresaFiltro(v as any);
          setTheme(v === "Viva" ? "viva" : "fiat");
        }}
      >
        <SelectTrigger className="h-9 w-[140px] md:w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todas">Todas empresas</SelectItem>
          {EMPRESAS.map((e) => (
            <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Badge variant="outline" className={`gap-1 hidden md:inline-flex ${online ? "text-success border-success/40" : "text-warning border-warning/40"}`}>
        {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {online ? "Online" : "Offline"}
      </Badge>

      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Bell className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleDark}>
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <div className="h-9 w-9 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-semibold text-sm shadow-glow">
        AC
      </div>
    </div>
  );
}
