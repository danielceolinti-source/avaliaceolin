// Edge function: OCR de placa + dados completos do veículo via SimplesAPI.
// Body: { imageBase64: string (data URL ou base64 puro) }
// Retorno: { placa, vehicle: {...}, source: "simplesapi" }
// Fallback: se SimplesAPI falhar, usa Lovable AI Gateway (Gemini Vision) só para extrair a placa.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIMPLESAPI_KEY = Deno.env.get("SIMPLESAPI_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function simplesApiOCR(imageBase64: string) {
  if (!SIMPLESAPI_KEY) return null;
  const r = await fetch("https://api.simplesapi.com.br/v1/ocr/plate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SIMPLESAPI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: imageBase64, include_vehicle_info: true }),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    console.error("simplesapi error", r.status, data);
    return { ok: false, status: r.status, data };
  }
  return { ok: true, data };
}

async function geminiOCR(dataUrl: string): Promise<string> {
  if (!LOVABLE_API_KEY) return "";
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Você é um OCR especializado em placas brasileiras (Mercosul AAA1A23 ou antigo AAA1234). Retorne SOMENTE a placa em maiúsculas, sem espaços/traços." },
        { role: "user", content: [
          { type: "text", text: "Qual é a placa nesta imagem?" },
          { type: "image_url", image_url: { url: dataUrl } },
        ]},
      ],
    }),
  });
  if (!resp.ok) return "";
  const d = await resp.json().catch(() => null);
  const raw: string = d?.choices?.[0]?.message?.content ?? "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function normalizeAno(year?: number, modelYear?: number): string {
  if (!year && !modelYear) return "";
  const y = String(year ?? modelYear).slice(-2).padStart(2, "0");
  const m = String(modelYear ?? year).slice(-2).padStart(2, "0");
  return `${y}/${m}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    // 1) SimplesAPI (OCR + dados do veículo em uma chamada)
    const simples = await simplesApiOCR(dataUrl);
    if (simples?.ok) {
      const plates = simples.data?.plates ?? [];
      const best = plates[0];
      if (best?.plate) {
        const v = best.vehicle_info;
        return new Response(JSON.stringify({
          placa: String(best.plate).toUpperCase().replace(/[^A-Z0-9]/g, ""),
          source: "simplesapi",
          confidence: best.confidence,
          vehicle: v ? {
            marca: v.brand,
            modelo: v.model,
            versao: v.version || "",
            ano: normalizeAno(v.year, v.model_year),
            anoFabricacao: v.year,
            anoModelo: v.model_year,
            cor: v.color,
            combustivel: v.fuel,
            cidade: v.city,
            uf: v.state,
            categoria: v.vehicle_type,
            cilindradas: v.engine_cc,
          } : null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 2) Fallback: Gemini OCR (somente extrai placa, sem dados)
    const placa = await geminiOCR(dataUrl);
    return new Response(JSON.stringify({
      placa,
      source: placa ? "gemini" : null,
      vehicle: null,
      message: placa ? null : "Não foi possível identificar a placa.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ocr-placa error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
