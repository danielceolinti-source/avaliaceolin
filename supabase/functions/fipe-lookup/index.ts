// Edge function: consulta dados de veículo por placa via scraping de
// placafipe.com (primário) e tabelafipebrasil.com (fallback).
// Body: { placa: string }
// Retorno: { ok, placa, marca, modelo, ano, anoModelo, cor, combustivel,
//            chassi, municipio, uf, fipes: [{codigo, modelo, valor}], source }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function parseValor(s: string): number {
  const m = s.replace(/\s/g, "").match(/R\$([\d.]+),(\d{2})/);
  if (!m) return 0;
  return Number(m[1].replace(/\./g, "")) + Number(m[2]) / 100;
}

// --- Parser placafipe.com ---
function parsePlacafipe(html: string) {
  // Pares <b>Label:</b></td><td>Valor</td>
  const fields: Record<string, string> = {};
  const re = /<b>\s*([^<:]+?)\s*:\s*<\/b>\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    fields[stripTags(m[1]).toLowerCase()] = stripTags(m[2]);
  }

  // Tabela FIPE: linhas com 3 td (codigo, modelo, valor R$...)
  const fipes: Array<{ codigo: string; modelo: string; valor: number }> = [];
  const reFipe = /<td[^>]*>\s*(\d{6}-\d)\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>\s*(R\$[^<]+)<\/td>/gi;
  while ((m = reFipe.exec(html)) !== null) {
    fipes.push({
      codigo: stripTags(m[1]),
      modelo: stripTags(m[2]),
      valor: parseValor(m[3]),
    });
  }

  if (!fields["marca"] && !fields["modelo"]) return null;

  return {
    marca: fields["marca"] || "",
    modelo: fields["modelo"] || "",
    ano: fields["ano"] || "",
    anoModelo: fields["ano modelo"] || fields["ano modelo"] || "",
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

// --- Parser tabelafipebrasil.com (fallback) ---
function parseTabelaFipeBrasil(html: string) {
  const fields: Record<string, string> = {};
  // Pattern semelhante: <strong>Label:</strong> Value ou linhas de tabela
  const re1 = /<(?:strong|b)>\s*([^<:]+?)\s*:?\s*<\/(?:strong|b)>\s*[: ]*\s*([^<\n]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(html)) !== null) {
    const k = stripTags(m[1]).toLowerCase();
    const v = stripTags(m[2]);
    if (v && v.length < 200 && !fields[k]) fields[k] = v;
  }
  // td/td genérico
  const re2 = /<td[^>]*>\s*([^<:]+?)\s*:\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi;
  while ((m = re2.exec(html)) !== null) {
    const k = stripTags(m[1]).toLowerCase();
    const v = stripTags(m[2]);
    if (!fields[k]) fields[k] = v;
  }

  const fipes: Array<{ codigo: string; modelo: string; valor: number }> = [];
  const reFipe = /(\d{6}-\d)[\s\S]{0,400}?(R\$[\s\d.,]+)/gi;
  while ((m = reFipe.exec(html)) !== null) {
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

async function scrape(url: string) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  return { status: r.status, html: await r.text() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { placa } = await req.json();
    if (!placa) {
      return new Response(JSON.stringify({ error: "placa é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPlaca = String(placa).toUpperCase().replace(/[^A-Z0-9]/g, "");

    let parsed: ReturnType<typeof parsePlacafipe> | null = null;
    let source = "";
    let debug: any = {};

    // 1. Tenta placafipe.com
    try {
      const { status, html } = await scrape(`https://placafipe.com/placa/${cleanPlaca}`);
      debug.placafipe = { status, len: html.length };
      if (status === 200) {
        parsed = parsePlacafipe(html);
        if (parsed) source = "placafipe.com";
      }
    } catch (e) {
      debug.placafipeError = String(e);
    }

    // 2. Fallback tabelafipebrasil.com
    if (!parsed) {
      try {
        const { status, html } = await scrape(`https://www.tabelafipebrasil.com/placa/${cleanPlaca}`);
        debug.tabelafipe = { status, len: html.length };
        if (status === 200) {
          parsed = parseTabelaFipeBrasil(html);
          if (parsed) source = "tabelafipebrasil.com";
        }
      } catch (e) {
        debug.tabelafipeError = String(e);
      }
    }

    if (!parsed) {
      return new Response(
        JSON.stringify({
          ok: false,
          placa: cleanPlaca,
          message: "Não foi possível consultar dados da placa. Preencha manualmente.",
          debug,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, placa: cleanPlaca, source, ...parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fipe-lookup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
