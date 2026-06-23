export type LoadRequestParseResult = {
  company_name?: string | null;
  material_type?: string | null;
  quantity?: number | null;
  unit?: string | null;
  pickup_location?: string | null;
  delivery_location?: string | null;
  rate_type?: string | null;
};

const MATERIAL_MAP: Array<{ keyword: RegExp; value: string }> = [
  { keyword: /fill\s+sand/i, value: "fill_sand" },
  { keyword: /sand/i, value: "sand" },
  { keyword: /gravel/i, value: "gravel_34" },
  { keyword: /crushed\s+stone/i, value: "crushed_stone" },
  { keyword: /top\s*soil/i, value: "topsoil" },
  { keyword: /clay/i, value: "clay" },
  { keyword: /demolition|debris/i, value: "demolition" },
];

function parseWithHeuristics(text: string): LoadRequestParseResult {
  const normalized = text.replace(/\s+/g, " ").trim();

  const material_type =
    MATERIAL_MAP.find((m) => m.keyword.test(normalized))?.value || null;

  const quantityMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(yards?|yds?|tons?|ton|loads?|load|hours?|hr)/i,
  );
  const quantity = quantityMatch ? Number(quantityMatch[1]) : null;
  const unit = quantityMatch ? quantityMatch[2].toLowerCase() : null;

  const rateMatch = normalized.match(/per\s*(ton|yard|load|hour)/i);
  const rate_type = rateMatch ? `per_${rateMatch[1].toLowerCase()}` : null;

  const pickupMatch =
    normalized.match(
      /(?:pickup|pick up|load|origin)(?: at| from|:)?\s*([^,.;]+)/i,
    ) ||
    normalized.match(/from\s+([^,.;]+?)\s+(?:to|deliver|drop|dump)/i);
  const deliveryMatch =
    normalized.match(
      /(?:deliver|drop|dump|destination)(?: to| at|:)?\s*([^,.;]+)/i,
    ) || normalized.match(/to\s+([^,.;]+)$/i);

  return {
    material_type,
    quantity: Number.isFinite(quantity) ? quantity : null,
    unit,
    pickup_location: pickupMatch ? pickupMatch[1].trim() : null,
    delivery_location: deliveryMatch ? deliveryMatch[1].trim() : null,
    rate_type,
  };
}

async function parseWithOpenAI(
  content: string,
): Promise<LoadRequestParseResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_PARSER_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract load request fields from text. Return JSON with keys: company_name, material_type, quantity, unit, pickup_location, delivery_location, rate_type.",
        },
        { role: "user", content },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const contentValue = data?.choices?.[0]?.message?.content;
  if (!contentValue) return null;

  try {
    const parsed = JSON.parse(contentValue);
    return {
      company_name: parsed.company_name ?? null,
      material_type: parsed.material_type ?? null,
      quantity:
        parsed.quantity !== undefined && parsed.quantity !== null
          ? Number(parsed.quantity)
          : null,
      unit: parsed.unit ?? null,
      pickup_location: parsed.pickup_location ?? null,
      delivery_location: parsed.delivery_location ?? null,
      rate_type: parsed.rate_type ?? null,
    };
  } catch {
    return null;
  }
}

export async function parseLoadRequest(
  content: string,
): Promise<LoadRequestParseResult> {
  const heuristic = parseWithHeuristics(content);
  const ai = await parseWithOpenAI(content);

  return {
    company_name: ai?.company_name ?? null,
    material_type: ai?.material_type ?? heuristic.material_type ?? null,
    quantity:
      ai?.quantity !== null && ai?.quantity !== undefined
        ? ai.quantity
        : heuristic.quantity ?? null,
    unit: ai?.unit ?? heuristic.unit ?? null,
    pickup_location: ai?.pickup_location ?? heuristic.pickup_location ?? null,
    delivery_location:
      ai?.delivery_location ?? heuristic.delivery_location ?? null,
    rate_type: ai?.rate_type ?? heuristic.rate_type ?? null,
  };
}
