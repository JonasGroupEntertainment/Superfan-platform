"use client";

import { useState } from "react";
import { submitArtistApplicationAction } from "./actions";

/**
 * Simplified artist application — Step 1 only.
 *
 * Per Manus' May 2026 audit, the original 5-section form (20+ visible
 * fields) was too high-friction for a top-of-funnel lead capture. This
 * version asks only what the team needs to identify and follow up with
 * the artist; everything else moves to the existing post-acceptance
 * onboarding wizard at /admin/<slug>/setup.
 *
 * Fields, in order:
 *   1. Artist or band name (required)
 *   2. Contact name        (required)
 *   3. Contact email       (required)
 *   4. Primary genre       (required, single select)
 *   5. Primary music or social link (required)
 *   6. Launch timing       (required, select)
 *   7. What are you hoping to build?  (optional, 500-char textarea)
 *
 * The server action maps these to existing `applications` table
 * columns so no migration is required:
 *   primary genre        → genres[]            (single-element array)
 *   primary link         → social[]            ([{label: 'Primary', href}])
 *   launch timing        → expected_launch_date (free-form text)
 *   goals note           → community_pitch
 */

const GENRES = [
  "Country",
  "Pop",
  "Hip-Hop",
  "R&B",
  "Indie",
  "Rock",
  "Folk",
  "Electronic",
  "Latin",
  "Jazz",
  "Gospel",
  "Other",
];

const LAUNCH_TIMING = [
  { value: "asap", label: "ASAP" },
  { value: "30d", label: "Within 30 days" },
  { value: "60d", label: "Within 60 days" },
  { value: "90d_plus", label: "90+ days out" },
  { value: "exploring", label: "Just exploring" },
];

export default function ApplyForm() {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={submitArtistApplicationAction}
      onSubmit={() => setSubmitting(true)}
      className="space-y-6"
    >
      <div className="glass-card space-y-5 rounded-2xl p-6">
        <Field
          label="Artist or band name"
          name="display_name"
          required
          minLength={2}
          maxLength={120}
          placeholder="RaeLynn, Danger Twins, etc."
        />
        <Field
          label="Your name"
          name="contact_name"
          required
          minLength={2}
          maxLength={120}
          placeholder="Artist, manager, or team contact"
        />
        <Field
          label="Email"
          name="contact_email"
          type="email"
          required
          placeholder="name@example.com"
        />
        <Select
          label="Primary genre"
          name="primary_genre"
          required
          options={GENRES.map((g) => ({ value: g, label: g }))}
        />
        <Field
          label="Primary music or social link"
          name="primary_link"
          type="url"
          required
          placeholder="Spotify, Apple Music, Instagram, TikTok, or website URL"
          hint="Just one — whichever best represents your music right now."
        />
        <Select
          label="Launch timing"
          name="launch_timing"
          required
          options={LAUNCH_TIMING}
        />
        <Field
          label="What are you hoping to build with Fan Engage?"
          name="goals_note"
          textarea
          maxLength={500}
          placeholder="Tell us about your fan club, first drop, or engagement goals (optional)."
          hint="Optional — up to 500 characters."
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-xs text-white/65">
        No payment or contract is required to apply. After you submit,
        the Fan Engage team will review your artist profile and follow
        up by email with next steps within 48 hours.
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-white/45">
          Required fields are marked with *. We never share your data
          with third parties.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-gradient-to-r from-aurora to-ember px-6 py-3 text-sm font-semibold text-white shadow-glass transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit artist application →"}
        </button>
      </div>
    </form>
  );
}

// ─── Tiny field primitives ────────────────────────────────────────────────

function Field({
  label,
  name,
  type = "text",
  required,
  textarea,
  maxLength,
  minLength,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  hint?: string;
}) {
  const id = `f_${name}`;
  return (
    <label htmlFor={id} className="block">
      <span className="block text-sm font-medium text-white/85">
        {label}
        {required && <span className="ml-1 text-aurora" aria-hidden>*</span>}
      </span>
      {hint && (
        <span className="mt-0.5 block text-[11px] text-white/45">{hint}</span>
      )}
      {textarea ? (
        <textarea
          id={id}
          name={name}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          placeholder={placeholder}
          rows={3}
          className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-aurora focus:outline-none focus:ring-1 focus:ring-aurora"
          aria-required={required ? "true" : undefined}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          placeholder={placeholder}
          className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-aurora focus:outline-none focus:ring-1 focus:ring-aurora"
          aria-required={required ? "true" : undefined}
        />
      )}
    </label>
  );
}

function Select({
  label,
  name,
  options,
  required,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  const id = `f_${name}`;
  return (
    <label htmlFor={id} className="block">
      <span className="block text-sm font-medium text-white/85">
        {label}
        {required && <span className="ml-1 text-aurora" aria-hidden>*</span>}
      </span>
      <select
        id={id}
        name={name}
        required={required}
        defaultValue=""
        className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-aurora focus:outline-none focus:ring-1 focus:ring-aurora"
        aria-required={required ? "true" : undefined}
      >
        <option value="" disabled>
          Choose one…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
