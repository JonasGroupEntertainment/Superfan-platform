import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/clickup/webhook
 *
 * ClickUp → Paperclip webhook receiver.
 * Registered webhook ID: f26b7690-f467-41d4-92f3-51a97d53ae01
 *
 * Contract (release-readiness gate):
 *   - Missing task_id  → 202 { status: "ignored" }
 *   - Valid payload    → 200 { received: true, task_id, event }
 *
 * Status sync rules (JGF-66 Phase 3, Rule 4):
 *   - ClickUp "complete" → Paperclip issue → done
 *   - ClickUp "blocked"  → Paperclip issue tagged blocker:external-dependency
 *
 * TODO (JGF-66 Phase 4): Activate the Paperclip callback below once a
 * stable public URL for the local Paperclip instance is available.
 * Requires PAPERCLIP_API_KEY + PAPERCLIP_API_URL in Vercel env vars.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { task_id, event, history_items } = body as {
    task_id?: string;
    event?: string;
    history_items?: Array<{
      field?: string;
      after?: { status?: string };
    }>;
  };

  // ClickUp sends non-task events (e.g. listCreated) — ignore gracefully.
  // The release-readiness gate verifies this returns 202, not 404.
  if (!task_id) {
    return NextResponse.json(
      { status: "ignored", reason: "no task_id" },
      { status: 202 }
    );
  }

  console.log(`[clickup/webhook] ${event ?? "unknown"} → task ${task_id}`);

  // ── Paperclip status sync (Phase 4 — activate when tunnel is stable) ──
  const paperclipUrl = process.env.PAPERCLIP_API_URL;
  const paperclipKey = process.env.PAPERCLIP_API_KEY;

  if (paperclipUrl && paperclipKey && event === "taskStatusUpdated") {
    const statusItem = history_items?.find((h) => h.field === "status");
    const newStatus = statusItem?.after?.status?.toLowerCase();

    let paperclipStatus: string | null = null;
    let paperclipLabel: string | null = null;

    if (newStatus === "complete") {
      paperclipStatus = "done";
    } else if (newStatus === "blocked") {
      paperclipLabel = "blocker:external-dependency";
    }

    if (paperclipStatus || paperclipLabel) {
      try {
        // Look up the Paperclip issue linked to this ClickUp task.
        const lookupRes = await fetch(
          `${paperclipUrl}/api/issues?clickup_task_id=${encodeURIComponent(task_id)}`,
          { headers: { Authorization: `Bearer ${paperclipKey}` } }
        );

        if (lookupRes.ok) {
          const { issues } = (await lookupRes.json()) as {
            issues?: Array<{ id: string }>;
          };
          const issue = issues?.[0];

          if (issue) {
            const patchBody: Record<string, unknown> = {};
            if (paperclipStatus) patchBody.status = paperclipStatus;
            if (paperclipLabel) patchBody.addLabel = paperclipLabel;

            await fetch(`${paperclipUrl}/api/issues/${issue.id}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${paperclipKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(patchBody),
            });

            console.log(
              `[clickup/webhook] synced task ${task_id} → Paperclip issue ${issue.id} (${paperclipStatus ?? paperclipLabel})`
            );
          }
        }
      } catch (err) {
        // Log but don't fail — we'd rather acknowledge receipt than
        // cause a ClickUp retry storm.
        console.error("[clickup/webhook] Paperclip sync failed", err);
      }
    }
  }

  return NextResponse.json({ received: true, task_id, event });
}
