// Edge function: helper FIPE encadeado (marca → modelo → ano → valor)
// usando a API pública fipe.online (parallelum) — sem scraping.
//
// Body:
//   { action: "brands" }                                            → lista marcas
//   { action: "models", brandCode: "21" }                           → lista modelos da marca
//   { action: "years",  brandCode: "21", modelCode: "5585" }        → lista anos do modelo
//   { action: "value",  brandCode, modelCode, yearCode }            → valor FIPE
//   { action: "search", marca: "Jeep", modelo: "Renegade", ano? }   → tenta matchar tudo automaticamente
//
// Tipo: cars (carros). Para motos/caminhões trocar em FIPE_TYPE.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIPE_TOKEN = Deno.env.get("FIPE_API_TOKEN");
const FIPE_TYPE = "cars";
const FIPE_BASE = "https://fipe.parallelum.com.br/api/v2";

async function fipe(path: string) {
  const r = await fetch(`${FIPE_BASE}${path}`, {
    headers: FIPE_TOKEN ? { "X-Subscription-Token": FIPE_TOKEN } : {},
  });
  if (!r.ok) {
    console.error("fipe.online error", r.status, path);
    return null;
  }
  return r.json().catch(() => null);
}

function normalize(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function parseValor(v: string): number {
  if (!v) return 0;
  const m = v.replace(/\s/g, "").match(/R\$([\d.]+),(\d{2})/);
  if (!m) return 0;
  return Number(m[1].replace(/\./g, "")) + Number(m[2]) / 100;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "brands") {
      const data = await fipe(`/${FIPE_TYPE}/brands`);
      return new Response(JSON.stringify({ ok: true, brands: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "models") {
      const { brandCode } = body;
      if (!brandCode) return new Response(JSON.stringify({ error: "brandCode obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const data = await fipe(`/${FIPE_TYPE}/brands/${brandCode}/models`);
      return new Response(JSON.stringify({ ok: true, models: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "years") {
      const { brandCode, modelCode } = body;
      if (!brandCode || !modelCode) return new Response(JSON.stringify({ error: "brandCode e modelCode obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const data = await fipe(`/${FIPE_TYPE}/brands/${brandCode}/models/${modelCode}/years`);
      return new Response(JSON.stringify({ ok: true, years: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "value") {
      const { brandCode, modelCode, yearCode } = body;
      if (!brandCode || !modelCode || !yearCode) {
        return new Response(JSON.stringify({ error: "brandCode, modelCode e yearCode obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await fipe(`/${FIPE_TYPE}/brands/${brandCode}/models/${modelCode}/years/${yearCode}`);
      return new Response(JSON.stringify({
        ok: true,
        ...(data || {}),
        valor: parseValor(data?.price || ""),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "search") {
      // Tentativa de match automático marca → top modelos por similaridade → ano
      const { marca, modelo, ano } = body;
      if (!marca) return new Response(JSON.stringify({ error: "marca obrigatória" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const brands = await fipe(`/${FIPE_TYPE}/brands`);
      if (!Array.isArray(brands)) return new Response(JSON.stringify({ ok: false, message: "FIPE indisponível" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const target = normalize(marca);
      const brand = brands.find((b: any) => normalize(b.name) === target)
        || brands.find((b: any) => normalize(b.name).includes(target) || target.includes(normalize(b.name)));

      if (!brand) return new Response(JSON.stringify({ ok: false, message: "Marca não encontrada" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const models = await fipe(`/${FIPE_TYPE}/brands/${brand.code}/models`);
      if (!Array.isArray(models)) return new Response(JSON.stringify({ ok: false, brand, message: "Modelos indisponíveis" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const hint = normalize(modelo || "");
      const tokens = (hint.match(/[a-z0-9]{2,}/g) || []);
      const scored = models.map((m: any) => {
        const n = normalize(m.name);
        let score = 0;
        for (const t of tokens) if (n.includes(t)) score += t.length;
        if (hint && n.includes(hint)) score += 5;
        return { ...m, score };
      }).sort((a: any, b: any) => b.score - a.score);

      const suggestions = scored.filter((s: any) => s.score > 0).slice(0, 10);

      // Se houver ano, tentar resolver melhor sugestão
      let bestValue: any = null;
      if (suggestions[0] && ano) {
        const years = await fipe(`/${FIPE_TYPE}/brands/${brand.code}/models/${suggestions[0].code}/years`);
        const anoNum = String(ano).match(/\d{2,4}/)?.[0];
        const matchYear = Array.isArray(years) ? years.find((y: any) => String(y.code).startsWith(anoNum || "")) : null;
        if (matchYear) {
          const v = await fipe(`/${FIPE_TYPE}/brands/${brand.code}/models/${suggestions[0].code}/years/${matchYear.code}`);
          if (v) bestValue = { ...v, valor: parseValor(v.price || "") };
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        brand,
        suggestions,
        bestValue,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "action inválida. Use: brands | models | years | value | search" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fipe-lookup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
