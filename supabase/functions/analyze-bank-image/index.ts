/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: "expense" | "income";
}

interface AnalysisResponse {
  transactions: Transaction[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
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

    const imageUrl = `data:${mimeType || "image/png"};base64,${imageBase64}`;

    const prompt = `Analyze this bank statement image and extract all transactions.

For each transaction, extract:
- date: The date in YYYY-MM-DD format
- description: The transaction description/text
- amount: The absolute value as a positive number (e.g., 1500.50)
- type: "expense" if money went out (negative/debit), "income" if money came in (positive/credit)

Return ONLY a valid JSON object with this exact structure:
{
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "ICA Maxi Kvantum",
      "amount": 523.50,
      "type": "expense"
    },
    {
      "date": "2024-01-14",
      "description": "Lön från Arbetsgivare AB",
      "amount": 28500,
      "type": "income"
    }
  ]
}

Important:
- Parse Swedish number formats (1 234,50 → 1234.50)
- Handle both positive and negative amounts correctly
- If you can't extract any transactions, return {"transactions": []}
- Only return the JSON, no other text`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to analyze image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";
    
    console.log("AI response content:", content);

    // Extract JSON from the response
    let analysisResult: AnalysisResponse;
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse transaction data",
          transactions: [] 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and clean the transactions
    const validTransactions = (analysisResult.transactions || [])
      .filter((t: Transaction) => {
        return t.date && t.description && typeof t.amount === "number" && t.amount > 0;
      })
      .map((t: Transaction) => ({
        date: t.date,
        description: t.description.trim(),
        amount: Math.abs(t.amount),
        type: t.type === "income" ? "income" : "expense",
      }));

    console.log(`Extracted ${validTransactions.length} valid transactions`);

    return new Response(
      JSON.stringify({ transactions: validTransactions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in analyze-bank-image:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
