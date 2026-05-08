// Edge function: consulta dados de veículo por placa via Firecrawl
// (placafipe.com primário, tabelafipebrasil.com fallback) e enriquece
// com sugestões de modelo via API fipe.online (parallelum).
// Body: { placa: string }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const FIPE_TOKEN = Deno.env.get("FIPE_API_TOKEN");

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}
function parseValor(s: string): number {
  const m = s.replace(/\s/g, "").match(/R\$([\d.]+),(\d{2})/);
  if (!m) return 0;
  return Number(m[1].replace(/\./g, "")) + Number(m[2]) / 100;
}

async function firecrawlScrape(url: string): Promise<{ html?: string; markdown?: string; rawHtml?: string; _status?: number; _keys?: string[] } | null> {
  if (!FIRECRAWL_KEY) return null;
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["html", "rawHtml", "markdown"], onlyMainContent: false, waitFor: 3000, proxy: "stealth" }),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data) {
    console.error("firecrawl error", r.status, data);
    return { _status: r.status, _keys: [] };
  }
  const d = data?.data ?? data;
  return { ...d, _status: r.status, _keys: Object.keys(d || {}) };
}

function parsePlacafipe(html: string) {
  const fields: Record<string, string> = {};
  const re = /<b>\s*([^<:]+?)\s*:\s*<\/b>\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    fields[stripTags(m[1]).toLowerCase()] = stripTags(m[2]);
  }
  const fipes: Array<{ codigo: string; modelo: string; valor: number }> = [];
  const reFipe = /<td[^>]*>\s*(\d{6}-\d)\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>\s*(R\$[^<]+)<\/td>/gi;
  while ((m = reFipe.exec(html)) !== null) {
    fipes.push({ codigo: stripTags(m[1]), modelo: stripTags(m[2]), valor: parseValor(m[3]) });
  }
  if (!fields["marca"] && !fields["modelo"]) return null;
  return {
    marca: fields["marca"] || "",
    modelo: fields["modelo"] || "",
    ano: fields["ano"] || "",
    anoModelo: fields["ano modelo"] || "",
    cor: fields["cor"] || "",
    combustivel: fields["combustível"] || fields["combustivel"] || "",
    chassi: fields["chassi"] || "",
    cilindrada: fields["cilindrada"] || "",
    potencia: fields["potencia"] || fields["potência"] || "",
    municipio: fields["município"] || fields["municipio"] || "",
    uf: fields["uf"] || "",
    fipes,
  };
}

function parseTabelaFipeBrasil(html: string, markdown?: string) {
  const fields: Record<string, string> = {};
  const text = markdown || stripTags(html);
  // Regex genérica "Marca: VALOR"
  const labels = ["Marca", "Modelo", "Ano", "Ano Modelo", "Cor", "Combustível", "Combustivel", "Chassi", "Cilindrada", "Potência", "Potencia", "Município", "Municipio", "UF"];
  for (const lab of labels) {
    const re = new RegExp(`${lab}\\s*[:\\-]\\s*([^\\n|]{1,80})`, "i");
    const m = text.match(re);
    if (m) fields[lab.toLowerCase()] = m[1].trim();
  }
  const fipes: Array<{ codigo: string; modelo: string; valor: number }> = [];
  const reFipe = /(\d{6}-\d)[^\n]{0,200}?(R\$\s*[\d.]+,\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = reFipe.exec(text)) !== null) {
    fipes.push({ codigo: m[1], modelo: "", valor: parseValor(m[2]) });
  }
  if (!fields["marca"] && !fields["modelo"]) return null;
  return {
    marca: fields["marca"] || "",
    modelo: fields["modelo"] || "",
    ano: fields["ano"] || "",
    anoModelo: fields["ano modelo"] || "",
    cor: fields["cor"] || "",
    combustivel: fields["combustível"] || fields["combustivel"] || "",
    chassi: fields["chassi"] || "",
    cilindrada: fields["cilindrada"] || "",
    potencia: fields["potencia"] || fields["potência"] || "",
    municipio: fields["município"] || fields["municipio"] || "",
    uf: fields["uf"] || "",
    fipes,
  };
}

// --- Enriquecimento via fipe.online (parallelum) ---
const FIPE_BASE = "https://fipe.parallelum.com.br/api/v2";
async function fipeFetch(path: string) {
  const r = await fetch(`${FIPE_BASE}${path}`, {
    headers: FIPE_TOKEN ? { "X-Subscription-Token": FIPE_TOKEN } : {},
  });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

async function buscarOpcoesModelo(marcaNome: string, modeloHint: string, anoHint?: string) {
  if (!marcaNome) return { brand: null, models: [] as any[], suggestions: [] as any[] };
  const brands = await fipeFetch("/cars/brands");
  if (!Array.isArray(brands)) return { brand: null, models: [], suggestions: [] };
  const target = normalize(marcaNome);
  const brand = brands.find((b: any) => normalize(b.name) === target)
    || brands.find((b: any) => normalize(b.name).includes(target) || target.includes(normalize(b.name)));
  if (!brand) return { brand: null, models: [], suggestions: [] };

  const models = await fipeFetch(`/cars/brands/${brand.code}/models`);
  if (!Array.isArray(models)) return { brand, models: [], suggestions: [] };

  // Sugerir top matches por similaridade simples com modeloHint
  const hint = normalize(modeloHint);
  const scored = models.map((m: any) => {
    const n = normalize(m.name);
    let score = 0;
    // tokens do hint
    const tokens = hint.match(/[a-z0-9]{2,}/g) || [];
    for (const t of tokens) if (n.includes(t)) score += t.length;
    if (n.includes(hint)) score += 5;
    return { ...m, score };
  }).sort((a: any, b: any) => b.score - a.score);

  const suggestions = scored.filter((s: any) => s.score > 0).slice(0, 10);
  return { brand, models, suggestions };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { placa } = await req.json();
    if (!placa) {
      return new Response(JSON.stringify({ error: "placa é obrigatória" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!FIRECRAWL_KEY) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPlaca = String(placa).toUpperCase().replace(/[^A-Z0-9]/g, "");

    let parsed: ReturnType<typeof parsePlacafipe> | null = null;
    let source = "";
    const debug: any = {};

    try {
      const res = await firecrawlScrape(`https://placafipe.com/placa/${cleanPlaca}`);
      debug.placafipe = { status: res?._status, keys: res?._keys, htmlLen: res?.html?.length, rawLen: res?.rawHtml?.length, mdLen: res?.markdown?.length, sample: (res?.rawHtml || res?.html || "").slice(0, 800) };
      const html = res?.rawHtml || res?.html || "";
      if (html) {
        parsed = parsePlacafipe(html);
        if (parsed) source = "placafipe.com";
        debug.placafipeParsed = !!parsed;
      }
    } catch (e) { debug.placafipeError = String(e); }

    if (!parsed) {
      try {
        const res = await firecrawlScrape(`https://www.tabelafipebrasil.com/placa/${cleanPlaca}`);
        debug.tabelafipe = { status: res?._status, keys: res?._keys, htmlLen: res?.html?.length, rawLen: res?.rawHtml?.length, mdLen: res?.markdown?.length };
        const html = res?.html || res?.rawHtml || "";
        if (html) {
          parsed = parseTabelaFipeBrasil(html, res?.markdown);
          if (parsed) source = "tabelafipebrasil.com";
          debug.tabelafipeParsed = !!parsed;
        }
      } catch (e) { debug.tabelafipeError = String(e); }
    }

    if (!parsed) {
      return new Response(
        JSON.stringify({
          ok: false, placa: cleanPlaca,
          message: "Não foi possível consultar dados da placa. Preencha manualmente.",
          debug,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enriquecer com lista FIPE
    const { brand, suggestions } = await buscarOpcoesModelo(parsed.marca, parsed.modelo, parsed.ano);

    return new Response(
      JSON.stringify({
        ok: true,
        placa: cleanPlaca,
        source,
        ...parsed,
        fipe: { brand, suggestions },
        debug,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fipe-lookup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
