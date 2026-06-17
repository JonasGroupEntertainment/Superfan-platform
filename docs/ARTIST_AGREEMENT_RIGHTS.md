# Artist Agreement — Rights Checklist

**Purpose.** A structured punch list of every right, license, and obligation that needs to be addressed in the Fan Engage Pro Artist Agreement, derived from what we've actually built and shipped. Hand to George as a drafting outline — not legal language.

**Last updated.** 2026-05-23
**Owner.** Kevin (product) / George (legal)

---

## 1. Content Licenses Granted by Artist to Platform

Things the artist uploads or supplies that the platform needs the right to use.

- **Profile content** — bio, tagline, display name, stage name, hero image, focal-point coordinates, accent color palette, genres, social links. Non-exclusive, royalty-free, worldwide license for use on the platform and in platform marketing.
- **Promotional imagery and ad mats** — offer images, drop artwork, merch photography (anything uploaded to `community-uploads`). Right to display, resize, crop, and re-export.
- **Brand marks** — limited license to display artist logo and brand colors on the artist page and in offer cards, fan emails, daily briefs, and push notifications.
- **Audio / video clips** (when shipped) — separate carve-out for any music, video, or rich-media content uploaded by artist or their team; clarify whether the platform may transcode, generate previews, or embed externally.
- **AI-generated derivatives of artist content** — right to generate recommendations, summaries, drafted posts, and ranked feeds from artist content for in-platform use.
- **Sublicensing to fans** — clarify that fans get a personal, non-commercial right to view, share within the platform, and earn rewards against this content; fans do NOT receive a redistribution license.

---

## 2. Name, Likeness, and Identity Rights

- Right to use the artist's name, stage name, image, and likeness throughout the artist page, marketing copy, fan-facing notifications, app store listings, and case studies.
- Right to feature the artist as a launch partner or sample tenant in platform sales materials (with approval workflow for net-new uses outside the standard product surfaces).
- Right to publish founding-fan, leaderboard, and "X fans of [Artist]" public counts.
- Right of artist to revoke marketing-use license with notice while preserving in-product use.

---

## 3. Fan Data Rights and PII

The single largest area of risk. Needs clear ownership terms.

- **Platform owns the fan database.** Fans sign up for Fan Engage Pro, not for an individual artist. The artist receives a license to engage their fans through the platform, not a copy of the list.
- **No bulk export of fan PII to the artist** without explicit fan opt-in per fan.
- **Aggregate analytics belong to artist** — fan count, tier distribution, engagement metrics, geographic heat maps (aggregated, not PII).
- **Fan-level PII (email, phone, address) is gated by the per-fan privacy toggle.** Artist sees only what the fan has opted to share. (We shipped this control at `/me/privacy`.)
- **Artist may NOT contact fans outside the platform** unless that specific fan has opted to share their contact info AND consented to off-platform outreach.
- **On artist departure**, the artist does not take the fan list with them. Fans remain platform members.
- **Right of access / deletion** — fans can request deletion of their account and PII per applicable law (CCPA, GDPR if EU fans). Spell out how this affects historical artist analytics.
- **Children's data** — confirm minimum age (13 COPPA, 16 GDPR) and that artist confirms they are not targeting minors.

---

## 4. Commerce and Rewards Rights

Tied to the offers/rewards/points economy we've built.

- **Offer creation rights** — artist creates merch, experiences, collectibles, digital goods, and tickets through admin tools. Right to set price (points or USD), inventory, min tier, and fulfillment rules.
- **Points economy ownership** — platform owns and defines the points-to-USD relationship and tier thresholds (Bronze / Silver / Gold / Platinum). Artist does not unilaterally set tier cutoffs.
- **Revenue share** — define platform's % of paid-offer revenue, payout cadence, threshold, payment method, and chargeback handling.
- **Refunds and disputes** — who handles, who absorbs cost, escalation path.
- **Fulfillment obligation** — artist is responsible for delivering merch / experiences / tickets they list. Platform is not a guarantor of fulfillment, but reserves the right to remove the artist for repeated non-delivery.
- **Inventory accuracy** — artist warrants inventory counts are accurate; oversells are artist's liability.
- **Sales tax / VAT** — clarify who collects, files, and remits.
- **Counterfeit / IP-clean merch** — artist warrants all merch they list is genuine and they have all required clearances (label, publisher, brand, photographer credits).

---

## 5. Communications Rights

Covers the messaging surfaces we've built or have on the roadmap.

- **Email** — platform sends transactional email (signup, password reset, points earned, redemption confirmation) on behalf of the artist's fan relationship. Marketing email gates require fan opt-in.
- **Daily brief / push notifications** — platform may include the artist's content in cross-artist surfaces (top movers, new drops, daily brief) at platform's discretion.
- **Artist-initiated posts** — when artist publishes a post or drop, platform reserves the right to notify the artist's fan base and to feature the post in cross-artist feeds.
- **Frequency caps** — platform reserves the right to throttle artist sends to protect deliverability and fan experience.
- **Spam / CAN-SPAM / CASL** — artist's posts must comply; platform may remove non-compliant content.
- **Unsubscribe** — fans can unsubscribe from artist-specific notifications without unsubscribing from the platform.

---

## 6. AI and Machine-Learning Rights

Important given our 20-feature AI roadmap and the 9 features already shipped.

- **In-platform AI use is permitted** — recommendations, content suggestions, summarization, draft generation, leaderboard ranking, daily brief authoring. Artist consents to their content being processed by AI for these in-product features.
- **No third-party LLM training without explicit consent.** Platform will not sell or license artist content to train external foundation models. If platform later wants to fine-tune its own model on artist content, that requires a separate opt-in.
- **AI-generated drafts** that the artist publishes are artist-owned. AI-generated outputs used in cross-artist platform surfaces (e.g., daily brief copy) are platform-owned.
- **Voice and likeness in AI** — explicit prohibition on generating synthetic audio, video, or imagery of the artist without separate written consent (deepfake protection).
- **Right to audit** — artist can request a summary of how their content is being used by AI features.

---

## 7. Content Moderation and Removal

- **Platform's right to remove** content that violates law, terms of service, or third-party IP — without prior notice in egregious cases.
- **Artist's right to remove** their own content at any time via admin tools; platform commits to processing removal within X business days for fan-visible surfaces, with reasonable retention for legal/transactional records.
- **Fan-uploaded content involving the artist** (community uploads, comments, avatar images) — artist may request removal of content that violates their IP, is defamatory, or is otherwise objectionable; platform has discretion on edge cases.
- **DMCA / safe-harbor** — designated agent, takedown procedure, counter-notice process.

---

## 8. Term, Termination, and Wind-Down

- **Term** — initial term, auto-renewal, notice period.
- **Termination for cause** — material breach, IP violation, illegal activity, fulfillment failures.
- **Termination for convenience** — notice period and what happens to in-flight offers and outstanding points balances.
- **Effect on fans** — clarify that fans remain platform members and that the artist's content is removed within X days, except where retention is legally required (transaction records, tax, dispute resolution).
- **Outstanding payouts** — final reconciliation timeline.
- **Surviving clauses** — IP warranties, indemnification, fan data restrictions, confidentiality.

---

## 9. Representations and Warranties

Artist warrants:

- They own or have all necessary rights to every piece of content they upload (bio, images, ad mats, merch, audio, video).
- They have rights to use their stage name and any brand marks they upload.
- They are not subject to a conflicting exclusive deal that prevents using the platform.
- They are over 18 and authorized to enter the agreement on behalf of any LLC / management entity listed.
- They will comply with applicable consumer-protection, advertising, and tax laws.
- They will not use the platform to harass, defame, or target minors.

Platform warrants:

- It will operate the platform with reasonable care.
- It will protect fan PII consistent with its privacy policy.
- It will not sell artist content to third parties outside the scope of operating the platform.

---

## 10. Indemnification and Liability

- **Artist indemnifies platform** for: IP claims arising from artist-uploaded content, merch authenticity disputes, fulfillment failures, and artist's tax / regulatory failures.
- **Platform indemnifies artist** for: platform-level data breaches caused by platform negligence, claims that the platform infrastructure itself infringes IP.
- **Liability caps** — define the cap (commonly fees paid in trailing 12 months) and carve-outs (gross negligence, willful misconduct, indemnification obligations, IP infringement, breach of confidentiality).
- **Insurance** — whether artist is required to carry commercial general liability + product liability for merch.

---

## 11. Confidentiality

- Fan-level data is confidential.
- Platform's roadmap, pricing terms, and unreleased features shared with artist are confidential.
- Artist's unreleased drops, tour dates, or strategic content shared with platform team are confidential.

---

## 12. Exclusivity and Competitive Restrictions

- **Default position is non-exclusive** — artist may use competing fan platforms.
- Whether platform-funded launch support (e.g., custom domain wiring, dedicated marketing) creates a limited exclusivity period.
- Whether artist may run a fan-engagement feature on their own owned site simultaneously.

---

## 13. Approval and Customization Workflows

Tied to admin tools we've built.

- **Brand-page edits** — artist controls hero, focal point, accent colors, bio, tagline, socials, genres via admin tools.
- **Offer creation** — artist creates offers; platform reserves the right to review and pull offers that violate policy.
- **Custom domain** — if applicable, who owns the domain registration, DNS, and SSL renewal (we've documented Raymond + Kevin handling wire-up).
- **Visual identity guardrails** — minimum standards for hero image quality, social-link accuracy, etc.

---

## 14. Modifications to the Platform

- Platform's right to modify, add, or sunset features.
- Material changes require X days' notice and don't take effect retroactively for in-flight commitments (e.g., live offers, outstanding points balances).
- If platform sunsets a feature the artist actively relies on (e.g., points marketplace), define wind-down terms.

---

## 15. Dispute Resolution and Governing Law

- Governing law and venue.
- Mediation / arbitration clause.
- Class-action waiver (if applicable).
- Carve-out for injunctive relief (IP, confidentiality).

---

## 16. Assignment, Notice, and Boilerplate

- Assignment — platform may assign in connection with a sale; artist may not assign without consent.
- Notice address and electronic notice acceptance.
- Force majeure.
- Entire-agreement, severability, no-waiver clauses.

---

## Open Questions for George

1. **Revenue share %** — what's the default cut on paid offers? Per-artist negotiation or platform-wide?
2. **Fan PII transfer on artist termination** — current position is platform retains; confirm enforceable.
3. **AI training opt-in** — should this be opt-out by default or opt-in?
4. **Minor / under-18 fan exposure** — do we need age-gating now or post-launch?
5. **Sales tax collection responsibility** — platform-as-marketplace-facilitator vs. artist-as-seller?
6. **Custom domain ownership** — when Raymond + Kevin wire it up, who holds the registration?
7. **Per-artist side letter vs. standard ToS** — single boilerplate agreement for all artists or per-artist negotiated?

---

## Source Material

This checklist was derived from the following shipped or in-progress platform surfaces:
- `/admin/artists/[slug]/edit-form.tsx` — brand-page editor
- `/admin/offers` — offer creation with image / ad mat upload
- `/rewards` — fan-facing marketplace with points + tiers
- `/me/privacy` — per-fan PII visibility toggles
- `lib/socials/parse.ts` — social-link aggregation
- AI roadmap (9 of 20 features shipped)
- Loyalty tiers Bronze / Silver / Gold / Platinum
- Daily brief + push notification surfaces
- Custom domain plan (Raymond + Kevin)
