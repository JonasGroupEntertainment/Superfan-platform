/**
 * lib/alt-text/generate.ts
 *
 * Calls Claude Haiku 4.5 (vision-capable) to generate accessibility
 * alt text for an uploaded image. Designed to fail open: returns ""
 * (empty string) on any error so the UI can degrade gracefully.
 *
 * The fetch+base64 step is necessary because Anthropic's vision API
 * accepts inline base64 data (or image URLs that are publicly fetchable).
 * Supabase Storage URLs are typically public, so we could pass them
 * directly — but for some buckets they're signed and can expire.
 * Base64 is robust for both cases.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const MODEL = "claude-haiku-4-5";

const MAX_ALT_LEN = 200; // server-side guard; prompt asks for ≤125 but we allow some slack

export type AltTextContext = {
  image_url: string;
  /** Optional: artist or brand context — helps the model use a fan-friendly tone */
  artist_or_brand_name?: string | null;
  /** Optional: post body the fan is drafting — helps disambiguate
   *  what's important about the image. */
  partial_body?: string;
};

interface AnthropicMessageResponse {
  content: Array<{ type: string; text?: string }>;
}

export async function generateAltText(ctx: AltTextContext): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "";

  // 1. Fetch image bytes
  let imageBuffer: ArrayBuffer;
  let mediaType: string;
  try {
    const imgRes = await fetch(ctx.image_url);
    if (!imgRes.ok) return "";
    mediaType = imgRes.headers.get("content-type") || "image/jpeg";
    if (!mediaType.startsWith("image/")) return "";
    imageBuffer = await imgRes.arrayBuffer();
  } catch {
    return "";
  }

  // 2. Base64 encode
  const base64 = Buffer.from(imageBuffer).toString("base64");

  // 3. Build vision message
  const userContent = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: base64,
      },
    },
    {
      type: "text",
      text: buildPrompt(ctx),
    },
  ];

  // 4. Call Anthropic
  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
        temperature: 0.2,
      }),
    });
  } catch {
    return "";
  }

  if (!response.ok) return "";

  let json: AnthropicMessageResponse;
  try {
    json = (await response.json()) as AnthropicMessageResponse;
  } catch {
    return "";
  }

  const text = (json.content.find((c) => c.type === "text")?.text ?? "").trim();
  return normalizeAltText(text);
}

function normalizeAltText(s: string): string {
  if (!s) return "";
  // Strip surrounding quotes the model sometimes adds
  let cleaned = s.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  // Strip "Alt text:" or "Description:" prefixes
  cleaned = cleaned.replace(/^(alt\s*text|description|caption)\s*[:\-—]\s*/i, "");
  // Cap length
  if (cleaned.length > MAX_ALT_LEN) {
    cleaned = cleaned.slice(0, MAX_ALT_LEN - 1).trimEnd() + "…";
  }
  return cleaned;
}

function buildPrompt(ctx: AltTextContext): string {
  const parts: string[] = [];
  if (ctx.artist_or_brand_name) {
    parts.push(`This image was uploaded to ${ctx.artist_or_brand_name}'s fan community.`);
  }
  if (ctx.partial_body && ctx.partial_body.trim().length >= 8) {
    parts.push(
      `The fan is captioning the photo with: "${ctx.partial_body.trim().slice(0, 200)}". Use that for context but don't repeat the caption verbatim.`,
    );
  }
  parts.push("");
  parts.push(
    "Write one short alt-text description for accessibility. Output ONLY the alt text — no quotes, no commentary.",
  );
  return parts.join("\n");
}

const SYSTEM_PROMPT = `You write alt text for community photos to make them accessible to screen-reader users.

Rules:
  * Under 125 characters.
  * Start with the subject — DO NOT begin with "image of", "picture of", "photo of".
  * Describe what's visible, not why it was posted.
  * Casual tone, not stuffy.
  * Output ONLY the alt text — no quotes, no commentary, no markdown.`;
