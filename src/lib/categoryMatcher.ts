/**
 * Smart category matching - checks keywords and history before AI fallback
 */

import { supabase } from "@/integrations/supabase/client";

export type CategoryId = "mat" | "boende" | "transport" | "noje" | "restaurang" | "alkohol" | "klader" | "halsa" | "shopping" | "resor" | "ovrigt";

interface CategoryMatch {
  category: CategoryId;
  confidence: "high" | "medium" | "low";
  source: "keyword" | "history" | "ai";
}

// Swedish merchants/services mapped to categories
const KEYWORD_RULES: { pattern: RegExp; category: CategoryId }[] = [
  // Mat (groceries)
  { pattern: /\b(ica|coop|willys|lidl|hemköp|city\s*gross|mathem|mat\.se|netto|ö&b|tempo)\b/i, category: "mat" },
  { pattern: /\b(mataffär|livsmedel|grocery|supermarket)\b/i, category: "mat" },

  // Restaurang
  { pattern: /\b(max\s*hamburgar|mcdonalds|mcdonald|burger\s*king|subway|pizza|kebab|sushi|thai|kina\s*restaurang|espresso\s*house|starbucks|wayne's\s*coffee|fika|café|cafe|konditori|bageri|donken)\b/i, category: "restaurang" },
  { pattern: /\b(restaurant|restaurang|lunch|middag|brunch|uber\s*eats|foodora|wolt|bolt\s*food|just\s*eat)\b/i, category: "restaurang" },

  // Alkohol
  { pattern: /\b(systembolaget|systemet|vin\s*&\s*sprit)\b/i, category: "alkohol" },
  { pattern: /\b(bar\s|pub\s|nattklubb|krog\b)/i, category: "alkohol" },

  // Transport
  { pattern: /\b(sl\b|sj\b|västtrafik|skånetrafiken|ul\b|länstrafiken|mtr|storstockholm|oresundståg|öresundståg)\b/i, category: "transport" },
  { pattern: /\b(taxi|uber|bolt|cabonline|sverigetaxi|topcab)\b/i, category: "transport" },
  { pattern: /\b(circle\s*k|ingo|okq8|preem|shell|st1|tanka|bensin|diesel|parkering|p-|easypark|apcoa)\b/i, category: "transport" },
  { pattern: /\b(voi|lime|tier|elsparkcykel|scooter)\b/i, category: "transport" },

  // Boende
  { pattern: /\b(hyra|hyresgäst|bostadsrätt|mäklare|hemnet)\b/i, category: "boende" },
  { pattern: /\b(vattenfall|fortum|eon|e\.on|ellevio|stockholm\s*exergi|el\s*&\s*värme|fjärrvärme)\b/i, category: "boende" },
  { pattern: /\b(telia|tele2|telenor|tre\b|3\b|hallon|comviq|halebop|bredband|fiber|internet)\b/i, category: "boende" },
  { pattern: /\b(försäkring|if\b|folksam|trygg\s*hansa|länsförsäkring|gjensidige)\b/i, category: "boende" },
  { pattern: /\b(hemmakväll|rusta|jula|biltema|bauhaus|hornbach|k-rauta|byggmax)\b/i, category: "boende" },
  { pattern: /\b(ikea|mio|em\s*home|lagerhaus)\b/i, category: "boende" },

  // Nöje (entertainment)
  { pattern: /\b(netflix|hbo|disney\+|disney\s*plus|viaplay|spotify|youtube\s*premium|apple\s*music|amazon\s*prime|paramount|c\s*more|discovery)\b/i, category: "noje" },
  { pattern: /\b(sf\s*bio|filmstaden|biograf|bio\b|konsert|teater|opera|museum|nöjespark|liseberg|gröna\s*lund|tivoli)\b/i, category: "noje" },
  { pattern: /\b(playstation|xbox|nintendo|steam|epic\s*games|spel)\b/i, category: "noje" },
  { pattern: /\b(gym|sats|friskis|fitness24seven|nordic\s*wellness|actic)\b/i, category: "noje" },

  // Hälsa
  { pattern: /\b(apotek|apotea|kronans|hjärtat|lloyds|apoteket)\b/i, category: "halsa" },
  { pattern: /\b(vårdcentral|kry|doktor\.se|min\s*doktor|1177|läkare|tandläkare|folktandvård|dentist|optiker|synoptik|synsam)\b/i, category: "halsa" },
  { pattern: /\b(massage|kiropraktor|fysioterapeut|friskvård)\b/i, category: "halsa" },

  // Kläder
  { pattern: /\b(h&m|hm\b|zara|uniqlo|lindex|kappahl|gina\s*tricot|cubus|dressmann|jack\s*&\s*jones|brothers|mq\b|stadium|xxl|intersport)\b/i, category: "klader" },
  { pattern: /\b(zalando|boozt|na-kd|nelly|åhléns|kläder|mode)\b/i, category: "klader" },

  // Shopping (general)
  { pattern: /\b(amazon|webhallen|elgiganten|mediamarkt|power|netonnet|inet|komplett|dustin|cdon|tradera|blocket)\b/i, category: "shopping" },
  { pattern: /\b(teknik|elektronik|apple\s*store|samsung)\b/i, category: "shopping" },
  { pattern: /\b(kjell\s*&\s*company|kjell\s*o\s*company|clas\s*ohlson|clasohlson)\b/i, category: "shopping" },

  // Resor
  { pattern: /\b(sas\b|norwegian|ryanair|flygbiljett|flyg|flightradar|booking\.com|hotels\.com|airbnb|hostel|hotell|hotel|expedia|momondo|skyscanner)\b/i, category: "resor" },
  { pattern: /\b(hertz|avis|europcar|sixt|hyrbil|biluthyrning)\b/i, category: "resor" },
  { pattern: /\b(interrail|eurolines|flixbus|vy\s*buss|swebus)\b/i, category: "resor" },
];

// Patterns that indicate a PRIVATE (non-shared) transaction
const PRIVATE_PATTERNS: RegExp[] = [
  // Salary & income
  /\b(lön|löneinsättning|salary|löneutbetalning)\b/i,
  // Internal transfers
  /\b(överföring|övf|eget\s*konto|sparande|spar\s*konto|intern\s*övf|autogiro\s*spar)\b/i,
  // Personal finance
  /\b(amortering|avbetalning|lån\s*betalning|csn|studielån|kronofogden)\b/i,
  // Swish to/from self, generic transfers
  /\b(swish|insättning|uttag\s*bankomat|kontantuttag)\b/i,
  // Tax & government personal
  /\b(skatteverket|skatteåterbäring|deklaration|a-kassa|fackavgift|fackförbund)\b/i,
  // Insurance payouts, refunds to self
  /\b(återbetalning|refund|kreditering|cashback)\b/i,
];

/**
 * Match transaction description against keyword rules
 */
export function matchByKeyword(description: string): CategoryMatch | null {
  const normalized = description.toLowerCase().trim();

  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(normalized)) {
      return {
        category: rule.category,
        confidence: "high",
        source: "keyword",
      };
    }
  }

  return null;
}

/**
 * Find similar transactions in history and use their category
 */
export async function matchByHistory(
  description: string,
  groupId: string
): Promise<CategoryMatch | null> {
  const normalized = description.toLowerCase().trim();

  // Extract merchant name (first 2-3 words typically contain the merchant)
  const words = normalized.split(/\s+/).slice(0, 3);
  if (words.length === 0) return null;

  // Search for similar descriptions in existing expenses
  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("description, category")
    .eq("group_id", groupId)
    .not("category", "eq", "ovrigt") // Ignore "other" category
    .limit(500);

  if (error || !expenses || expenses.length === 0) {
    return null;
  }

  // Find best match by checking if merchant name appears in historical transactions
  const matchCounts = new Map<CategoryId, number>();

  for (const expense of expenses) {
    const histDesc = expense.description.toLowerCase();

    // Check if any of our search words appear in the historical description
    const hasMatch = words.some(word =>
      word.length >= 3 && histDesc.includes(word)
    );

    if (hasMatch && expense.category) {
      const cat = expense.category as CategoryId;
      matchCounts.set(cat, (matchCounts.get(cat) || 0) + 1);
    }
  }

  if (matchCounts.size === 0) return null;

  // Find the most common category among matches
  let bestCategory: CategoryId | null = null;
  let bestCount = 0;

  for (const [category, count] of matchCounts) {
    if (count > bestCount) {
      bestCount = count;
      bestCategory = category;
    }
  }

  if (bestCategory && bestCount >= 1) {
    return {
      category: bestCategory,
      confidence: bestCount >= 3 ? "high" : "medium",
      source: "history",
    };
  }

  return null;
}

export interface TransactionToMatch {
  description: string;
  amount: number;
  date: string;
}

export interface MatchResult {
  index: number;
  category: CategoryId;
  isShared: boolean;
  confidence: "high" | "medium" | "low";
  source: "keyword" | "history" | "ai";
}

/**
 * Smart categorization: keyword → history → (leaves for AI fallback)
 * Returns matched transactions and indices that need AI
 */
export async function smartCategorize(
  transactions: TransactionToMatch[],
  groupId: string
): Promise<{ matched: MatchResult[]; needsAi: number[] }> {
  const matched: MatchResult[] = [];
  const needsAi: number[] = [];

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];

    // Try keyword match first (fast, high confidence)
    const keywordMatch = matchByKeyword(t.description);
    if (keywordMatch) {
      matched.push({
        index: i,
        category: keywordMatch.category,
        isShared: true,
        confidence: keywordMatch.confidence,
        source: keywordMatch.source,
      });
      continue;
    }

    // Try history match (medium confidence)
    const historyMatch = await matchByHistory(t.description, groupId);
    if (historyMatch) {
      matched.push({
        index: i,
        category: historyMatch.category,
        isShared: true,
        confidence: historyMatch.confidence,
        source: historyMatch.source,
      });
      continue;
    }

    // Needs AI categorization
    needsAi.push(i);
  }

  return { matched, needsAi };
}
