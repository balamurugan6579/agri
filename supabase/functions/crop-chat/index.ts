import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, recommendation, language, conversationHistory } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const langInstruction = language === 'ta' 
      ? "Respond in Tamil (தமிழ்). Use simple, clear Tamil that farmers and agricultural advisors can understand easily."
      : "Respond in English. Use simple, clear language that farmers and agricultural advisors can understand easily.";

    const systemPrompt = `You are CropSmart AI, an agricultural advisory assistant for Tamil Nadu, India. Your role is to explain crop recommendations to farmers and agricultural advisors.

${langInstruction}

IMPORTANT RULES:
1. You can ONLY explain the recommendation data provided - never make new predictions or override the system's recommendations
2. Keep responses concise (2-4 sentences max)
3. Use simple language appropriate for farmers and local advisors
4. Be helpful and encouraging
5. If asked about topics outside the recommendation, politely redirect to the crop advice

CURRENT RECOMMENDATION DATA:
${JSON.stringify(recommendation, null, 2)}

You can explain:
- Why this crop was recommended (soil nutrients, pH, weather conditions)
- Market price expectations (current and harvest time)
- Fertilizer requirements
- Irrigation/water needs
- Risks and precautions
- Whether this crop is successful in the district`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: query }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("crop-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
