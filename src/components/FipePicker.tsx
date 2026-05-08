import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Check } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Item = { code: string; name: string };
type Year = { code: string; name: string };

interface Props {
  initialMarca?: string;
  initialModelo?: string;
  initialAno?: string;
  onResolve: (data: {
    marca: string;
    modelo: string;
    versao?: string;
    ano: string;
    fipe: number;
  }) => void;
}

function PickerCombo({ label, items, value, onChange, placeholder, disabled, loading }: {
  label: string;
  items: Item[] | Year[];
  value?: Item | Year;
  onChange: (item: any) => void;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled || loading}
            className="mt-1.5 w-full justify-between h-11 font-normal"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (value?.name || <span className="text-muted-foreground">{placeholder}</span>)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-h-[60vh]" align="start">
          <Command>
            <CommandInput placeholder={`Buscar ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>Nenhum resultado.</CommandEmpty>
              <CommandGroup>
                {items.map((it) => (
                  <CommandItem
                    key={it.code}
                    value={it.name}
                    onSelect={() => { onChange(it); setOpen(false); }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value?.code === it.code ? "opacity-100" : "opacity-0")} />
                    {it.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function FipePicker({ initialMarca, initialModelo, initialAno, onResolve }: Props) {
  const [brands, setBrands] = useState<Item[]>([]);
  const [models, setModels] = useState<Item[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [brand, setBrand] = useState<Item>();
  const [model, setModel] = useState<Item>();
  const [year, setYear] = useState<Year>();
  const [loadingB, setLB] = useState(false);
  const [loadingM, setLM] = useState(false);
  const [loadingY, setLY] = useState(false);
  const [loadingV, setLV] = useState(false);
  const [valor, setValor] = useState<number>(0);

  // 1. Carrega marcas
  useEffect(() => {
    setLB(true);
    supabase.functions.invoke("fipe-lookup", { body: { action: "brands" } })
      .then(({ data, error }) => {
        if (error) { toast.error("Falha ao listar marcas FIPE"); return; }
        const list: Item[] = (data?.brands || []).map((b: any) => ({ code: String(b.code), name: b.name }));
        setBrands(list);
        // tenta selecionar marca inicial
        if (initialMarca) {
          const target = initialMarca.toLowerCase();
          const found = list.find((b) => b.name.toLowerCase() === target)
            || list.find((b) => b.name.toLowerCase().includes(target) || target.includes(b.name.toLowerCase()));
          if (found) setBrand(found);
        }
      })
      .finally(() => setLB(false));
  }, [initialMarca]);

  // 2. Marca → modelos
  useEffect(() => {
    if (!brand) { setModels([]); setModel(undefined); return; }
    setLM(true);
    supabase.functions.invoke("fipe-lookup", { body: { action: "models", brandCode: brand.code } })
      .then(({ data, error }) => {
        if (error) { toast.error("Falha ao listar modelos"); return; }
        const list: Item[] = (data?.models || []).map((m: any) => ({ code: String(m.code), name: m.name }));
        setModels(list);
        if (initialModelo) {
          const tk = initialModelo.toLowerCase();
          const found = list.find((m) => m.name.toLowerCase().includes(tk));
          if (found) setModel(found);
        }
      })
      .finally(() => setLM(false));
  }, [brand, initialModelo]);

  // 3. Modelo → anos
  useEffect(() => {
    if (!brand || !model) { setYears([]); setYear(undefined); return; }
    setLY(true);
    supabase.functions.invoke("fipe-lookup", { body: { action: "years", brandCode: brand.code, modelCode: model.code } })
      .then(({ data, error }) => {
        if (error) { toast.error("Falha ao listar anos"); return; }
        const list: Year[] = (data?.years || []).map((y: any) => ({ code: String(y.code), name: y.name }));
        setYears(list);
        if (initialAno) {
          const num = (initialAno.match(/\d{2,4}/) || [])[0];
          if (num) {
            const found = list.find((y) => y.code.startsWith(num) || y.name.startsWith(num));
            if (found) setYear(found);
          }
        }
      })
      .finally(() => setLY(false));
  }, [brand, model, initialAno]);

  // 4. Ano → valor FIPE
  useEffect(() => {
    if (!brand || !model || !year) { setValor(0); return; }
    setLV(true);
    supabase.functions.invoke("fipe-lookup", {
      body: { action: "value", brandCode: brand.code, modelCode: model.code, yearCode: year.code },
    }).then(({ data, error }) => {
      if (error) { toast.error("Falha ao buscar valor"); return; }
      setValor(data?.valor || 0);
    }).finally(() => setLV(false));
  }, [brand, model, year]);

  const podeAplicar = brand && model && year && valor > 0;

  const aplicar = () => {
    if (!brand || !model || !year) return;
    onResolve({
      marca: brand.name,
      modelo: model.name.split(" ").slice(0, 3).join(" "),
      versao: model.name,
      ano: year.name.replace(/.*?(\d{2,4})/, "$1").slice(0, 7),
      fipe: valor,
    });
    toast.success("FIPE aplicada", { description: `${brand.name} ${model.name}` });
  };

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-3 gap-3">
        <PickerCombo label="Marca" items={brands} value={brand} onChange={(v) => { setBrand(v); setModel(undefined); setYear(undefined); }} placeholder="Selecione" loading={loadingB} />
        <PickerCombo label="Modelo" items={models} value={model} onChange={(v) => { setModel(v); setYear(undefined); }} placeholder={brand ? "Selecione" : "Escolha a marca primeiro"} disabled={!brand} loading={loadingM} />
        <PickerCombo label="Ano" items={years} value={year} onChange={setYear} placeholder={model ? "Selecione" : "Escolha o modelo primeiro"} disabled={!model} loading={loadingY} />
      </div>
      <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Valor FIPE</div>
          <div className="text-2xl font-display font-bold tabular-nums">
            {loadingV ? <Loader2 className="h-5 w-5 animate-spin" /> : valor > 0 ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "—"}
          </div>
        </div>
        <Button onClick={aplicar} disabled={!podeAplicar} className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Sparkles className="h-4 w-4 mr-2" /> Aplicar FIPE
        </Button>
      </div>
    </div>
  );
}
