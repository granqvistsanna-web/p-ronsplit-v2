/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExpenseInput {
  id: string;
  description: string;
  amount: number;
  date: string;
}

interface CategorySuggestion {
  id: string;
  suggestedCategory: string;
  confidence: number;
  isShared: boolean;
}

const VALID_CATEGORIES = [
  "mat",
  "boende", 
  "transport",
  "noje",
  "restaurang",
  "alkohol",
  "klader",
  "halsa",
  "shopping",
  "resor",
  "ovrigt",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: "Supabase configuration missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

  if (claimsError || !claimsData?.claims?.sub) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { expenses } = await req.json();

    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      return new Response(
        JSON.stringify({ error: "No expenses provided", suggestions: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categoryDescriptions = VALID_CATEGORIES.map(cat => {
      switch(cat) {
        case "mat": return "mat - Matvaror, livsmedel, ICA, Coop, Hemköp, Willys";
        case "boende": return "boende - Hyra, el, försäkring, internet, hemtjänster";
        case "transport": return "transport - Bensin, SL, buss, tåg, taxi, parkering, bil";
        case "noje": return "noje - Bio, konserter, spel, streaming, Spotify, Netflix";
        case "restaurang": return "restaurang - Restauranger, café, lunch ute, takeaway";
        case "alkohol": return "alkohol - Systembolaget, vin, öl, sprit";
        case "klader": return "klader - Kläder, skor, accessoarer, H&M, Zalando";
        case "halsa": return "halsa - Apotek, läkare, tandläkare, gym, träning";
        case "shopping": return "shopping - Allmän shopping, elektronik, presenter";
        case "resor": return "resor - Flyg, hotell, semester, Airbnb";
        case "ovrigt": return "ovrigt - Övrigt som inte passar någon annan kategori";
        default: return cat;
      }
    }).join("\n");

    const expensesList = (expenses as ExpenseInput[]).map((e, i) => 
      `${i}. "${e.description}" - ${e.amount} kr (${e.date})`
    ).join("\n");

    const prompt = `Du är en svensk kategoriseringsassistent för hushållsutgifter i en delad ekonomi-app.

Kategorisera följande transaktioner till EN av dessa kategorier:
${categoryDescriptions}

Avgör också om varje transaktion är DELAD (gemensam hushållskostnad) eller PRIVAT (personlig):
- DELAD: matinköp, hyra, el, gemensamma restaurangbesök, hushållsartiklar
- PRIVAT: löneinsättningar, överföringar mellan egna konton, personliga prenumerationer, Swish-överföringar, amorteringar, CSN, skatteåterbetalningar, fackavgifter, uttag, insättningar, återbetalningar

Transaktioner att kategorisera:
${expensesList}

Svara ENDAST med JSON i detta format (ingen annan text):
{
  "suggestions": [
    {"index": 0, "category": "mat", "confidence": 0.95, "isShared": true},
    {"index": 1, "category": "ovrigt", "confidence": 0.8, "isShared": false}
  ]
}

Regler:
- "index" matchar transaktionens nummer ovan
- "category" måste vara exakt ett av: ${VALID_CATEGORIES.join(", ")}
- "confidence" är 0.0-1.0 hur säker du är
- "isShared" är true om det är en gemensam hushållskostnad, false om privat
- Om osäker på kategori, välj "ovrigt" med låg confidence
- Om osäker på delad/privat, anta delad (true)
- Svenska butiksnamn: ICA/Coop/Hemköp = mat, Systembolaget = alkohol, etc.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: prompt },
        ],
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to categorize expenses" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";
    
    console.log("AI response:", content);

    // Parse the JSON response
    let suggestions: CategorySuggestion[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const rawSuggestions = parsed.suggestions || [];
        
        // Map AI response to expense IDs and validate categories
        suggestions = rawSuggestions
          .filter((s: { index: number; category: string; confidence: number }) => 
            s.index >= 0 && 
            s.index < expenses.length && 
            VALID_CATEGORIES.includes(s.category)
          )
          .map((s: { index: number; category: string; confidence: number }) => ({
            id: (expenses as ExpenseInput[])[s.index].id,
            suggestedCategory: s.category,
            confidence: Math.min(1, Math.max(0, s.confidence || 0.5)),
          }));
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }

    console.log(`Generated ${suggestions.length} category suggestions`);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in categorize-expenses:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
