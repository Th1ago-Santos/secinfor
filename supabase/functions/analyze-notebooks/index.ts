import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all unique notebook models
    const { data: notebooks, error } = await supabase
      .from("notebooks")
      .select("modelo");

    if (error) throw error;
    if (!notebooks || notebooks.length === 0) {
      return new Response(JSON.stringify({ specs: [], averages: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Count models
    const modelCounts: Record<string, number> = {};
    notebooks.forEach((n: any) => {
      modelCounts[n.modelo] = (modelCounts[n.modelo] || 0) + 1;
    });

    const uniqueModels = Object.keys(modelCounts);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a hardware specialist. Given a list of notebook/laptop model names, estimate the typical hardware specifications for each. Return ONLY the tool call with the data. Be realistic with estimates based on the model name. If you can't identify a model, make reasonable assumptions based on the brand and any model numbers present.`
          },
          {
            role: "user",
            content: `Estimate hardware specs for these notebook models: ${JSON.stringify(uniqueModels)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_specs",
              description: "Return estimated hardware specifications for each notebook model",
              parameters: {
                type: "object",
                properties: {
                  models: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        modelo: { type: "string", description: "The original model name" },
                        processador: { type: "string", description: "Estimated processor (e.g. Intel Core i5-1135G7)" },
                        geracao_processador: { type: "number", description: "Processor generation number (e.g. 11 for 11th gen Intel)" },
                        velocidade_ghz: { type: "number", description: "Base clock speed in GHz" },
                        ram_gb: { type: "number", description: "Typical RAM in GB" },
                        armazenamento: { type: "string", description: "Typical storage (e.g. 256GB SSD)" },
                        classificacao: { type: "string", enum: ["Básico", "Intermediário", "Avançado"], description: "Performance tier" }
                      },
                      required: ["modelo", "processador", "geracao_processador", "velocidade_ghz", "ram_gb", "armazenamento", "classificacao"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["models"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_specs" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    const specs = parsed.models;

    // Calculate weighted averages
    let totalRam = 0, totalSpeed = 0, totalGen = 0, totalCount = 0;
    const tierCounts: Record<string, number> = { "Básico": 0, "Intermediário": 0, "Avançado": 0 };

    specs.forEach((s: any) => {
      const count = modelCounts[s.modelo] || 1;
      totalRam += s.ram_gb * count;
      totalSpeed += s.velocidade_ghz * count;
      totalGen += s.geracao_processador * count;
      totalCount += count;
      if (tierCounts[s.classificacao] !== undefined) {
        tierCounts[s.classificacao] += count;
      }
    });

    const averages = totalCount > 0 ? {
      ram_media: Math.round((totalRam / totalCount) * 10) / 10,
      velocidade_media: Math.round((totalSpeed / totalCount) * 100) / 100,
      geracao_media: Math.round((totalGen / totalCount) * 10) / 10,
      total_notebooks: totalCount,
      por_classificacao: tierCounts,
    } : null;

    // Add quantity to each spec
    const specsWithCount = specs.map((s: any) => ({
      ...s,
      quantidade: modelCounts[s.modelo] || 1,
    }));

    return new Response(JSON.stringify({ specs: specsWithCount, averages }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-notebooks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
