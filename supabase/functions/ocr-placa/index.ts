// Edge function: OCR de placa SOMENTE (sem dados do veículo).
// O usuário seleciona marca/modelo/ano manualmente via FIPE.Online.
// Body: { imageBase64: string }
// Retorno: { placa: string, source: "gemini" }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function geminiOCR(dataUrl: string): Promise<string> {
  if (!LOVABLE_API_KEY) return "";
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Você é um OCR especializado em placas brasileiras (Mercosul AAA1A23 ou antigo AAA1234). Retorne SOMENTE a placa em maiúsculas, sem espaços/traços/pontuação. Se não conseguir ler, retorne vazio." },
        { role: "user", content: [
          { type: "text", text: "Qual é a placa nesta imagem?" },
          { type: "image_url", image_url: { url: dataUrl } },
        ]},
      ],
    }),
  });
  if (!resp.ok) {
    console.error("gemini OCR error", resp.status);
    return "";
  }
  const d = await resp.json().catch(() => null);
  const raw: string = d?.choices?.[0]?.message?.content ?? "";
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
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
    const placa = await geminiOCR(dataUrl);
    return new Response(JSON.stringify({
      placa,
      source: placa ? "gemini" : null,
      message: placa ? null : "Não foi possível identificar a placa.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ocr-placa error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
