// Edge function: OCR de placa SOMENTE (sem dados do veículo).
// O usuário seleciona marca/modelo/ano manualmente via FIPE.Online.
// Body: { imageBase64: string }
// Retorno: { placa: string, source: "gemini" }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function geminiOCR(dataUrl: string, model = "google/gemini-2.5-flash"): Promise<string> {
  if (!LOVABLE_API_KEY) return "";
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: [
          "Você é um OCR especializado em placas veiculares brasileiras.",
          "Formatos válidos: Mercosul AAA1A23 (3 letras + 1 dígito + 1 letra + 2 dígitos) ou antigo AAA1234 (3 letras + 4 dígitos).",
          "Sempre 7 caracteres alfanuméricos. Cuidado com confusões: O↔0, I↔1, B↔8, S↔5, Z↔2, G↔6, Q↔O.",
          "Considere o contexto: posições 1-3 são SEMPRE letras; posições 5-7 do formato antigo são dígitos.",
          "Retorne APENAS os 7 caracteres em maiúsculas, sem traços, espaços, pontos ou texto explicativo.",
          "Se não houver placa visível ou legível, retorne string vazia.",
        ].join(" ") },
        { role: "user", content: [
          { type: "text", text: "Leia a placa do veículo nesta imagem e retorne apenas os 7 caracteres." },
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
    let placa = await geminiOCR(dataUrl, "google/gemini-2.5-flash");
    // Fallback automático para modelo mais potente se o flash não conseguir ler 7 caracteres
    if (!placa || placa.length < 7) {
      console.log("[ocr-placa] flash falhou (", placa, "), tentando gemini-2.5-pro...");
      const placaPro = await geminiOCR(dataUrl, "google/gemini-2.5-pro");
      if (placaPro && placaPro.length === 7) placa = placaPro;
    }
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
