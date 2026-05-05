"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractFields,
  nextAssistantMessage,
  type ChatMessage,
  type NextTurnResult,
} from "@/lib/onboarding-chat";

/**
 * Take the conversation so far and return the next assistant message.
 * Called from the client component on each user-send.
 */
export async function sendTurnAction(
  history: ChatMessage[],
): Promise<NextTurnResult> {
  // Defensive: clamp history shape so a malformed client payload can't
  // explode the Claude call.
  const cleaned: ChatMessage[] = (Array.isArray(history) ? history : [])
    .filter(
      (m): m is ChatMessage =>
        m !== null &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  return await nextAssistantMessage(cleaned);
}

/**
 * Extract structured fields from the conversation, write them to the
 * fan's row, and redirect to Fan Home. Called when the user clicks
 * "Save & continue" after Claude emits DONE.
 */
export async function finishAction(history: ChatMessage[]): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fields = await extractFields(history);

  // Only update fields that came back non-null from extraction so we
  // never blow away data the fan set elsewhere.
  const updates: Record<string, unknown> = {};
  if (fields.city) updates.city = fields.city;
  if (fields.favorite_song) updates.favorite_song = fields.favorite_song;
  if (fields.interest) updates.interest = fields.interest;
  if (typeof fields.sms_opted_in === "boolean") {
    updates.sms_opted_in = fields.sms_opted_in;
  }

  if (Object.keys(updates).length > 0) {
    const admin = createAdminClient();
    await admin.from("fans").update(updates).eq("id", user.id);
  }

  redirect("/");
}
