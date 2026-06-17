# AI #17 fraud detection v1 (FE)

Daily cron scans for suspicious fan activity, runs flagged candidates
through Claude Haiku for context-aware verdict, writes flags to a new
`fraud_signals` table. Admin dashboard at `/admin/fraud-signals` lists
pending flags with dismiss/confirm actions.

**No auto-action.** Every flag is human-reviewed. The recs doc warned
"be careful" for fraud-flavored features — we err strongly toward
false-negative bias (let real users through, queue uncertain cases for
human review rather than auto-restricting accounts).

## Architecture

```
Daily cron (03:00 UTC)
  ↓
1. Heuristic sweep
   - Burst posting (>5 posts/24h)
   - Burst commenting (>20 comments/24h)
   - Rapid points (>200 points + signup <7 days)
   - Sample of 5 candidates max per run (cost-bounded)
  ↓
2. For each candidate, gather activity:
   - profile (signup, points, tier, has_interest)
   - last 5 post bodies
   - last 10 comment bodies
   - 24h post/comment timestamps
  ↓
3. Claude Haiku verdict:
   - { verdict: legitimate|suspicious|unclear, confidence: 0..1, reasons: string[] }
   - Strong "lean legitimate if unsure" instruction in system prompt
  ↓
4. Write to fraud_signals where verdict != legitimate AND confidence >= 0.6
  ↓
5. Admin dashboard surfaces pending flags
```

## Heuristics chosen (v1)

Conservative thresholds, expected to surface ≤1 candidate/day at FE's
current volume:

| Trigger | Threshold | Rationale |
|---|---|---|
| `burst_posting` | >5 posts in 24h | Real fans rarely post that frequently |
| `burst_commenting` | >20 comments in 24h | Engagement farming pattern |
| `rapid_points` | >200 pts + signup <7d | Possible bot hitting tiers fast |

Heuristics surface candidates; Claude makes the actual judgment.

## Files

- `migration_fraud_signals.sql` — table + indexes + admin-only RLS
- `lib_detect.ts` → `frontend/lib/fraud-detection/index.ts` — gather +
  Claude verdict
- `cron_route.ts` → `frontend/app/api/cron/fraud-scan/route.ts`
- `patch_vercel_json.py` — adds `0 3 * * *` cron entry
- `admin_page.tsx` → `frontend/app/admin/fraud-signals/page.tsx`
- `admin_actions.ts` → server actions for dismiss/confirm
- `apply.sh`

## Apply

1. Run `migration_fraud_signals.sql` in FE Supabase
2. Then locally:

   ```bash
   bash _ai17_fraud_detection_bundle/apply.sh
   git push
   ```

## Cost

- Heuristic sweep: pure SQL, $0
- Claude verdicts: ~$0.0002 per candidate × ≤5 candidates/day = ~$0.001/day
- Admin page: free

## Smoke test

After deploy, manually trigger via Vercel cron-jobs page (Run on
`/api/cron/fraud-scan`). At FE's current volume there are zero
heuristic-triggering fans, so the response should be `{ scanned: 0,
flagged: 0 }`. To synthetically test, you can temporarily INSERT
many comments from one fan and trigger the cron — flags would appear
at `/admin/fraud-signals`. **Don't forget to revert.**

## Future v2 ideas

- IP / device-fingerprint clustering for sock-puppet detection
- Inline check in `claimReferralBonus` action (block at-risk redemption)
- Auto-suspend on repeated confirmed flags
- BEP port
