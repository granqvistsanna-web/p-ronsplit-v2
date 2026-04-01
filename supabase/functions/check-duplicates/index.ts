import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { type, group_id, amount, date, category, description, income_type, note } = body;

    if (!type || !group_id || amount == null || !date) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const duplicates: Array<{
      id: string;
      amount: number;
      date: string;
      description?: string;
      category?: string;
      type?: string;
      note?: string;
      similarity_score: number;
      match_reasons: string[];
    }> = [];

    if (type === "expense") {
      // Look for expenses with same group, similar amount, and close date
      const { data: candidates, error } = await supabase
        .from("expenses")
        .select("id, amount, date, description, category")
        .eq("group_id", group_id)
        .gte("date", shiftDate(date, -3))
        .lte("date", shiftDate(date, 3));

      if (error) {
        console.error("Error querying expenses:", error);
      }

      if (candidates) {
        for (const c of candidates) {
          const reasons: string[] = [];
          let score = 0;

          // Amount match (within 1% or exact)
          if (c.amount != null) {
            const diff = Math.abs(c.amount - amount);
            const pct = amount > 0 ? diff / amount : diff;
            if (diff === 0) {
              reasons.push("Samma belopp");
              score += 40;
            } else if (pct <= 0.01) {
              reasons.push("Snarlikt belopp");
              score += 25;
            }
          }

          // Date match
          if (c.date === date) {
            reasons.push("Samma datum");
            score += 30;
          } else if (c.date) {
            const daysDiff = Math.abs(daysBetween(date, c.date));
            if (daysDiff <= 1) {
              reasons.push("Närliggande datum");
              score += 20;
            }
          }

          // Category match
          if (category && c.category === category) {
            reasons.push("Samma kategori");
            score += 15;
          }

          // Description similarity
          if (description && c.description) {
            const sim = stringSimilarity(description.toLowerCase(), c.description.toLowerCase());
            if (sim > 0.7) {
              reasons.push("Liknande beskrivning");
              score += 15;
            }
          }

          if (score >= 50) {
            duplicates.push({
              id: c.id,
              amount: c.amount ?? 0,
              date: c.date ?? "",
              description: c.description ?? undefined,
              category: c.category ?? undefined,
              similarity_score: Math.min(score, 100),
              match_reasons: reasons,
            });
          }
        }
      }
    } else if (type === "income") {
      const { data: candidates, error } = await supabase
        .from("incomes")
        .select("id, amount, date, type, note")
        .eq("group_id", group_id)
        .gte("date", shiftDate(date, -3))
        .lte("date", shiftDate(date, 3));

      if (error) {
        console.error("Error querying incomes:", error);
      }

      if (candidates) {
        for (const c of candidates) {
          const reasons: string[] = [];
          let score = 0;

          // Amount match
          const diff = Math.abs(c.amount - amount);
          const pct = amount > 0 ? diff / amount : diff;
          if (diff === 0) {
            reasons.push("Samma belopp");
            score += 40;
          } else if (pct <= 0.01) {
            reasons.push("Snarlikt belopp");
            score += 25;
          }

          // Date match
          if (c.date === date) {
            reasons.push("Samma datum");
            score += 30;
          } else {
            const daysDiff = Math.abs(daysBetween(date, c.date));
            if (daysDiff <= 1) {
              reasons.push("Närliggande datum");
              score += 20;
            }
          }

          // Type match
          if (income_type && c.type === income_type) {
            reasons.push("Samma typ");
            score += 15;
          }

          // Note similarity
          if (note && c.note) {
            const sim = stringSimilarity(note.toLowerCase(), c.note.toLowerCase());
            if (sim > 0.7) {
              reasons.push("Liknande anteckning");
              score += 15;
            }
          }

          if (score >= 50) {
            duplicates.push({
              id: c.id,
              amount: c.amount,
              date: c.date,
              type: c.type ?? undefined,
              note: c.note ?? undefined,
              similarity_score: Math.min(score, 100),
              match_reasons: reasons,
            });
          }
        }
      }
    }

    // Sort by similarity score descending
    duplicates.sort((a, b) => b.similarity_score - a.similarity_score);

    return new Response(JSON.stringify({ duplicates: duplicates.slice(0, 5) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-duplicates error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper: shift a date string (YYYY-MM-DD) by N days
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// Helper: days between two date strings
function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((da - db) / (1000 * 60 * 60 * 24));
}

// Simple string similarity (Dice coefficient on bigrams)
function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigramsA = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.substring(i, i + 2));

  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    if (bigramsA.has(b.substring(i, i + 2))) matches++;
  }

  return (2 * matches) / (a.length - 1 + b.length - 1);
}
