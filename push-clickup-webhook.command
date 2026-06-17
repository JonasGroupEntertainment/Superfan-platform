#!/bin/bash
cd "$(dirname "$0")"

# Remove any stale git lock
rm -f .git/index.lock

# Stage and commit the new webhook route
git add frontend/app/api/clickup/webhook/route.ts
git commit -m "feat(clickup): add /api/clickup/webhook route handler

Creates the ClickUp → Paperclip webhook receiver missing from Vercel.
Contract: missing task_id → 202 ignored; valid payload → 200 received.
Unblocks JGF-66 release-readiness gate on canonical domain."

# Push to origin
git push origin main

echo ""
echo "✅ Done! Vercel will auto-deploy in ~30s."
