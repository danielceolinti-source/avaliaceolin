// Edge function: consulta dados de veículo / FIPE por placa.
// Usa fipe.online (token em FIPE_API_TOKEN). Em caso de falha, retorna fallback vazio.
// Body: { placa: string }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { placa } = await req.json();
    if (!placa) {
      return new Response(JSON.stringify({ error: "placa é obrigatória" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("FIPE_API_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "FIPE_API_TOKEN não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPlaca = String(placa).toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Try v2 endpoints commonly used by fipe.online
    const endpoints = [
      `https://fipe.online/api/v2/placa/${cleanPlaca}`,
      `https://fipe.online/api/placa/${cleanPlaca}`,
    ];

    let payload: any = null;
    let lastStatus = 0;
    let lastBody = "";

    for (const url of endpoints) {
      try {
        const r = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-API-Token": token,
            Accept: "application/json",
          },
        });
        lastStatus = r.status;
        const text = await r.text();
        lastBody = text.slice(0, 500);
        if (r.ok) {
          try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
          break;
        }
      } catch (e) {
        console.error("fipe endpoint error", url, e);
      }
    }

    if (!payload) {
      return new Response(
        JSON.stringify({
          ok: false,
          placa: cleanPlaca,
          message: "Não foi possível consultar a base FIPE agora. Preencha manualmente.",
          debug: { status: lastStatus, body: lastBody },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize a few common shapes
    const norm = {
      ok: true,
      placa: cleanPlaca,
      marca: payload?.marca ?? payload?.MARCA ?? payload?.brand ?? payload?.dados?.marca ?? "",
      modelo: payload?.modelo ?? payload?.MODELO ?? payload?.model ?? payload?.dados?.modelo ?? "",
      versao: payload?.versao ?? payload?.VERSAO ?? payload?.dados?.versao ?? "",
      ano: payload?.ano ?? payload?.anoModelo ?? payload?.year ?? payload?.dados?.ano ?? "",
      combustivel: payload?.combustivel ?? payload?.dados?.combustivel ?? "",
      chassi: payload?.chassi ?? payload?.dados?.chassi ?? "",
      fipe: Number(payload?.fipe?.valor ?? payload?.valor_fipe ?? payload?.fipe ?? payload?.dados?.fipe ?? 0) || 0,
      raw: payload,
    };

    return new Response(JSON.stringify(norm), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fipe-lookup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
