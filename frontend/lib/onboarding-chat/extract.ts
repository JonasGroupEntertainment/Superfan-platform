/**
 * AI #9: Extract structured fan-profile fields from a finished
 * onboarding chat. Single Claude call, JSON output, strict validation.
 */

import type { ChatMessage } from "./conversation";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const EXTRACTION_MODEL = "claude-haiku-4-5";

export type ExtractedFields = {
  city: string | null;
  music_outlet: string | null;
  interest: string | null;
  sms_opted_in: boolean | null;
};

interface AnthropicMessageResponse {
  content: Array<{ type: string; text?: string }>;
}

const EMPTY: ExtractedFields = {
  city: null,
  music_outlet: null,
  interest: null,
  sms_opted_in: null,
};

export async function extractFields(
  history: ChatMessage[],
): Promise<ExtractedFields> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || history.length === 0) return EMPTY;

  const transcript = history
    .map((m) => `${m.role === "user" ? "Fan" : "Host"}: ${m.content}`)
    .join("\n");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EXTRACTION_MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: transcript }],
      temperature: 0,
    }),
  });

  if (!response.ok) return EMPTY;

  const json = (await response.json()) as AnthropicMessageResponse;
  const text = (json.content.find((c) => c.type === "text")?.text ?? "").trim();
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return EMPTY;
  }
  if (typeof parsed !== "object" || parsed === null) return EMPTY;
  const r = parsed as Record<string, unknown>;

  return {
    city: stringOrNull(r.city, 80),
    music_outlet: stringOrNull(r.music_outlet, 200),
    interest: stringOrNull(r.interest, 400),
    sms_opted_in: typeof r.sms_opted_in === "boolean" ? r.sms_opted_in : null,
  };
}

function stringOrNull(v: unknown, maxLen: number): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

const SYSTEM_PROMPT = `Extract structured fan-profile fields from this onboarding chat. Output JSON ONLY. No markdown fences, no commentary.

Schema:
  {
    "city": string | null,
    "music_outlet": string | null,
    "interest": string | null,
    "sms_opted_in": boolean | null
  }

Rules:
  * city: city name only (no state). Null if not mentioned or unclear.
  * music_outlet: song title only, no quotes. Null if not mentioned.
  * interest: 1-2 sentence summary of what the fan said about the artist or what they're hoping for from the fan club. Null if they didn't say anything substantive.
  * sms_opted_in: true if they clearly said yes to SMS / texts / tour notifications. false if they declined. Null if not asked or ambiguous.
  * Don't infer beyond what the fan actually said. Empty answers → null.
  * If the fan said "I don't know" or skipped a topic, that field is null.

Output the JSON, nothing else.`;
