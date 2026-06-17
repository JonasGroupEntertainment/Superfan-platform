# Fan Engage / Brand Engage Pro — Launch Plan

_Last updated: 2026-05-11_

Two lists below: **Pre-launch** (must ship before the public push) and **Post-launch** (additive — ship after we have real volume and feedback). Point person in **bold** at the start of each item.

---

## 1. Pre-launch checklist

### Legal & compliance (highest financial exposure)

- [ ] **George** — TOS final draft. Working through TCPA / SMS opt-in language, auto-renewal disclosures (CA ARL + FTC click-to-cancel), CCPA / CPRA notice, fan-vs-artist user-type split, missing platform-feature coverage (sweepstakes / rewards / events / public profiles / referrals / marketplace), product-naming reconciliation. _Sent to George 5/11; punch list emailed Monday 9 AM EST._
- [ ] **George** — Privacy Policy aligned with TOS. Covers analytics SDKs, push notifications, SMS opt-in, CCPA rights, GDPR carve-out if needed.
- [ ] **George** — DMCA designated-agent registration with the U.S. Copyright Office. $6 fee, renews every 3 years, registers a named contact who receives copyright takedown notices. Without this, no DMCA safe-harbor protection — platform could be liable for fan-posted infringing content with statutory damages of $750–$30,000 per work. Registration is a ~10-minute form at dmca.copyright.gov; after registering, update the TOS DMCA section with the registered agent's name + contact.

_Decided: founding-fan badge reduction NOT planned. Team agreed current setup is fine._

### Auth & domain

- [ ] **Raymond** — Onboarding email field readOnly hotfix (task #312, in progress).
- [ ] **George leads procurement / decision; Raymond + Kevin wire it** — Custom domains. `fanengage.com` (or chosen alternative) for FE; final brand-engage domain for BEP. Vercel + DNS + Supabase OAuth callback URLs.
- [ ] **Kevin** — Apple SSO as a second SSO option alongside Google (currently deferred; needed because some iOS users won't sign up with Google).

### Content (the platform looks empty without this)

- [ ] **Carla** — RaeLynn refresh items. _Deadline 5/12._
- [ ] **George (with support from Raymond)** — Hunter Hawkins hub content: bio, hero photo, tagline, genres, 5-10 events, 3-5 rewards, premium tier copy, welcome message, seed community posts. Currently has placeholder bio. _Deadline 5/15._
- [ ] **Leslie (with support from Raymond)** — Dan Marshall hub content. _Deadline 5/15._
- [ ] **Carla (working directly with Amy)** — Danger Twins hub content. _Deadline 5/15._
- [ ] **Kevin + Carla** — Nellie's marketplace offers seeded on BEP. Currently 0 offers; need a handful before public launch (also exercises the new image-upload flow on `/admin/offers`).

### Revenue & operational

- [ ] **George + Lori Squires** — Stripe Connect KYB approval. External blocker; required for artist payouts and any paid premium tier.
- [ ] **Raymond + Kevin** — Reward fulfillment workflow. Who ships physical rewards, how shipping addresses are collected, who handles cancellations. No code change strictly needed if the flow is operational, but document before shipping merch.
- [ ] **Raymond** — Mailchimp deliverability check. Verify weekly digests, signup confirmations, reminder emails are landing in inbox (not spam) for Gmail, Outlook, Yahoo.
- [ ] **Raymond** — SMS deliverability + opt-in flow end-to-end. Confirm "Reply STOP" works, msgs/month frequency disclosure shown at signup.

### Quality & monitoring

- [ ] **Raymond** — Sentry / error monitoring confirmed wired up and surfacing errors to a channel someone watches.
- [ ] **Kevin** — AI cost monitoring. Alerts on OpenAI usage (embeddings, moderation, captions, drafts) so we don't get a $5K surprise bill at first traffic spike.
- [ ] **Kevin + Raymond** — Rate limiting on user-callable AI endpoints. Particularly `/api/ai/draft-comment` and `/api/ai/caption-image`.
- [ ] **Raymond** — Backup verification. Confirm Supabase point-in-time recovery is enabled on both projects and we know how to restore.
- [ ] **Kevin + Raymond** — End-to-end smoke test the full new-fan journey on both FE and BEP: signup → onboarding → first community post → first reward redemption → first event RSVP → first share → unsubscribe. Find the friction.

### Founding-member campaign

- [ ] **Carla (with support from day-to-day managers: Carla, George, Leslie, Raymond)** — Founding-member positioning. What's the cap, what's the perk, when does the window close? The marketing narrative needs to be solidified before launch.
- [ ] **Carla (with support from day-to-day managers)** — Email + social launch copy. Short, in-voice for each artist.
- [ ] **Carla (with support from day-to-day managers)** — Press / industry outreach plan. Who's getting the early heads-up?

---

## 2. Post-launch list

**Default ownership for everything below:**
- **Kevin + Raymond** — all build-out / engineering deliverables
- **George + Lori Squires** — all financial / legal elements
- **Day-to-day managers (Carla, George, Leslie, Raymond)** — artist-facing elements for their respective artists

Individual items below note any deviations from these defaults.

### Phase A — first 30 days after launch (operational stability)

- [ ] Per-artist KPI dashboard in `/admin` — signups, MAU, points earned, redemptions, top community posts. Daily admin brief already cron-ships a summary; this would be a live view.
- [ ] Moderation queue triage tools — bulk-approve, bulk-hide, exportable audit log. Already exists at `/admin/moderation` but improve once we see real volume.
- [ ] Real points distribution check — re-run the analysis from 5/11 every 2-3 weeks to see if tier thresholds need tuning based on real fan behavior.
- [ ] Onboarding wizard at `/admin/<slug>/setup` (Phase F.2) — already partially built; finish the flow so new artists can self-onboard without us hand-holding.
- [ ] Cancellation / refund flow for paid premium subscriptions.

### Phase B — months 2-3 (engagement features)

- [ ] Remaining AI roadmap items (11 of 20 still pending). Candidates: smart event recommendations, smarter feed ranking, AI-generated drop suggestions, AI-assisted fan support replies, content-quality scoring.
- [ ] Annual tier reset OR "Legend" tier above Platinum — addresses the team's concern about post-Platinum engagement. Decide which model after 90 days of real data.
- [ ] Per-tier email/push template differentiation — Platinum fans should get different copy than Bronze. Currently uniform.
- [ ] Mailchimp digest content quality monitoring — A/B test subject lines, track open rates.
- [ ] Founder share card analytics — how many shares actually result in signups? If conversion is low, iterate copy.
- [ ] Referral incentive tuning — currently +150 points per verified referral. Once we see real referral volume, decide whether to add multiplier or tier-bonus.
- [ ] Re-engagement / winback campaigns — for fans who haven't opened the app in 14+ days. Push + email.
- [ ] Mobile nav + PWA install prompt polish — already shipped, iterate based on install-rate data.

### Phase C — months 3-6 (platform expansion)

- [ ] Live event streaming integration — artists do livestream listening parties, with viewing gated by tier.
- [ ] Member-to-member messaging (DMs) — gated to Premium / certain tiers. Heavy moderation requirement.
- [ ] Native app wrapper (Capacitor or Expo) — PWA install is fine for now, but app-store presence helps discoverability.
- [ ] Multi-language support — if RaeLynn or any brand goes international, Spanish first.
- [ ] Custom per-artist domain support — let artists run on `fans.raelynn.com` if they want, instead of `fanengage.com/artists/raelynn`.
- [ ] Bulk drop scheduling across artists (super-admin) — schedule the same drop type across multiple artists in one click.
- [ ] Marketplace categories + filters — once we have 30+ items.
- [ ] Per-fan recommendation feed v2 — beyond what AI #7 (personalized feed) does, factor in tier, time-of-day, recently-redeemed.

### Phase D — months 6-12 (scale & monetization)

- [ ] Advanced loyalty economy — separate "status points" (tier-determining, expire annually) from "spend points" (currency, never expire).
- [ ] Stripe Connect rollout to all artists once individual KYB approvals come through.
- [ ] Artist self-serve onboarding fully automated — apply → auto-approve under conditions → setup wizard → live, no team touch required.
- [ ] AI-assisted artist onboarding — generate first community post, suggest initial drops, draft welcome message based on bio + genre.
- [ ] B2B sales materials for Brand Engage Pro — case study from Nellie's, ROI metrics, pitch deck.
- [ ] API for brand partners — let third parties integrate their POS / loyalty data.
- [ ] In-platform direct ticket sales (vs. just RSVP) — currently we link out for tickets.

### Phase E — longer horizon (strategic)

- [ ] White-label deployment — let a label or agency run their own instance of the platform.
- [ ] Cross-artist fan migration — fan follows multiple artists, points accrue differently per artist but they have one identity.
- [ ] Live fan voting on artist decisions (setlists, merch designs) — extension of predictions/polls.
- [ ] Physical / hybrid events — meetups, gatherings, where the platform handles invites + RSVP + check-in.
- [ ] Catalog management for artists — release calendar, social-post scheduler, full creator suite. Competitive with Spotify for Artists.

---

## Things to decide explicitly (not blocking, but should resolve)

- **What "launch" means.** Public push to general fans? RaeLynn tour kick-off? Industry announcement? Defining this anchors the rest of the timeline.
- **Beta vs. GA framing.** Are we in "research preview" / "early access" still, or is RaeLynn's hub already "live"? Affects what we communicate publicly when things break.
- **Press strategy.** Music-industry trades? Country-music outlets? Changes copy and timing.
- **Founding cap.** Hard cap on founding-fan slots per artist? Currently no enforced limit.
- **Pricing for paid premium.** Need a final number before Stripe Connect KYB anyway.

---

## Team roster (for reference)

| Person | Role | Email |
|---|---|---|
| Kevin | Founder / product / engineering | kevinjonassr@gmail.com |
| Carla | Operations / day-to-day artist manager (RaeLynn, Danger Twins) | carla@jonasgroup.com |
| Raymond | Engineering / dev support | raymond@jonasgroup.com |
| George | Legal / finance / day-to-day (Hunter Hawkins) | george@jonasgroup.com |
| Leslie DiPiero | President, Jonas Group Publishing. Day-to-day for Dan Marshall (signed to JG Publishing); works with Dan's manager Erin Mooring | leslie.dipiero@jonasgroup.com |
| Lori Squires | Financial (Clarity Consulting SC) | loris@clarityconsultingsc.com |
| Amy (Stroup) | Direct partner — Danger Twins | — |
