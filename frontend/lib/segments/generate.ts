/**
 * AI #16: Translate a natural-language description of a fan audience
 * into a structured SegmentFilter object via Claude Haiku 4.5.
 *
 * Output is strictly validated — Claude's response is parsed as JSON
 * and any unknown keys, wrong types, or out-of-range values are dropped.
 * The validator is the trust boundary; the SQL evaluator must never
 * receive an unvalidated filter.
 */

import { FAN_TIERS, type FanTier, type SegmentFilter } from "./types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
export const SEGMENT_MODEL = "claude-haiku-4-5";

interface AnthropicMessageResponse {
  content: Array<{ type: string; text?: string }>;
}

export class SegmentGenerationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "SegmentGenerationError";
  }
}

/**
 * Translate description → SegmentFilter. Returns null on missing API key
 * (caller should surface a clear error). Throws on API failures so the
 * caller can show a retry path.
 */
export async function generateSegmentFilter(
  description: string,
): Promise<SegmentFilter | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const trimmed = description.trim();
  if (!trimmed) return {};

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: SEGMENT_MODEL,
      max_tokens: 400,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: trimmed }],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new SegmentGenerationError(`Anthropic ${response.status}: ${detail}`);
  }

  const json = (await response.json()) as AnthropicMessageResponse;
  const text = (json.content.find((c) => c.type === "text")?.text ?? "").trim();

  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new SegmentGenerationError(
      `Claude returned non-JSON: ${stripped.slice(0, 200)}`,
    );
  }

  return validateFilter(parsed);
}

function buildSystemPrompt(): string {
  return `You translate natural-language descriptions of music-fan audiences into a structured filter object.

Output JSON ONLY matching this schema. OMIT any field that doesn't apply — never invent fields not in the schema.

Schema:
  {
    "tiers": ["bronze" | "silver" | "gold" | "platinum"]?,
    "total_points_min": number?,
    "total_points_max": number?,
    "city_contains": string?,         // matched ILIKE %X% on fans.city
    "interest_contains": string?,     // matched ILIKE %X% on fans.interest
    "sms_opted_in": boolean?,
    "email_opted_in": boolean?,
    "signup_within_days": number?,    // signed up within the last N days (new fans)
    "signup_older_than_days": number?, // signed up more than N days ago (loyal/long-tenured)
    "min_posts_last_30d": number?     // posted at least N times in the artist's community in last 30 days (engagement proxy)
  }

Mapping common requests:
  "super-engaged" / "active" → min_posts_last_30d: 3
  "highly active" / "power users" → min_posts_last_30d: 5
  "dormant" → signup_older_than_days: 60, no min_posts (handled separately)
  "new fans" / "recent signups" → signup_within_days: 30
  "loyal fans" / "long-time fans" → signup_older_than_days: 180
  "top tier" / "VIP" → tiers: ["gold", "platinum"]
  "high points" → total_points_min: 5000
  "willing to be texted" → sms_opted_in: true
  US state names ("Tennessee", "Texas") → city_contains: "TN" / "TX"
  city names ("Nashville") → city_contains: "Nashville"

If the description includes both a state name and a city, prefer the city.

If something doesn't map to the schema, omit it rather than approximating wildly.

Examples:
  Input: "super-engaged Bailee fans in Tennessee"
  Output: {"city_contains": "TN", "min_posts_last_30d": 3}

  Input: "new bronze fans this month"
  Output: {"tiers": ["bronze"], "signup_within_days": 30}

  Input: "loyal gold and platinum members willing to receive SMS"
  Output: {"signup_older_than_days": 180, "tiers": ["gold", "platinum"], "sms_opted_in": true}

  Input: "fans in Nashville with 5000+ points"
  Output: {"city_contains": "Nashville", "total_points_min": 5000}

Output JSON only. No markdown fences. No commentary.`;
}

function validateFilter(raw: unknown): SegmentFilter {
  if (typeof raw !== "object" || raw === null) return {};
  const r = raw as Record<string, unknown>;
  const out: SegmentFilter = {};

  if (Array.isArray(r.tiers)) {
    const cleaned = r.tiers.filter(
      (t): t is FanTier => typeof t === "string" && (FAN_TIERS as readonly string[]).includes(t),
    );
    if (cleaned.length > 0) out.tiers = cleaned as FanTier[];
  }

  if (typeof r.total_points_min === "number" && Number.isFinite(r.total_points_min) && r.total_points_min >= 0) {
    out.total_points_min = Math.floor(r.total_points_min);
  }
  if (typeof r.total_points_max === "number" && Number.isFinite(r.total_points_max) && r.total_points_max >= 0) {
    out.total_points_max = Math.floor(r.total_points_max);
  }
  if (typeof r.city_contains === "string" && r.city_contains.trim().length > 0 && r.city_contains.length <= 80) {
    out.city_contains = r.city_contains.trim();
  }
  if (typeof r.interest_contains === "string" && r.interest_contains.trim().length > 0 && r.interest_contains.length <= 80) {
    out.interest_contains = r.interest_contains.trim();
  }
  if (typeof r.sms_opted_in === "boolean") out.sms_opted_in = r.sms_opted_in;
  if (typeof r.email_opted_in === "boolean") out.email_opted_in = r.email_opted_in;

  if (typeof r.signup_within_days === "number" && r.signup_within_days >= 0 && r.signup_within_days <= 3650) {
    out.signup_within_days = Math.floor(r.signup_within_days);
  }
  if (typeof r.signup_older_than_days === "number" && r.signup_older_than_days >= 0 && r.signup_older_than_days <= 3650) {
    out.signup_older_than_days = Math.floor(r.signup_older_than_days);
  }
  if (typeof r.min_posts_last_30d === "number" && r.min_posts_last_30d >= 0 && r.min_posts_last_30d <= 1000) {
    out.min_posts_last_30d = Math.floor(r.min_posts_last_30d);
  }

  return out;
}
