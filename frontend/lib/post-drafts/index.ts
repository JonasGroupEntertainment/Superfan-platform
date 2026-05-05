/**
 * Public surface of the post-drafts module.
 * Always import from "@/lib/post-drafts".
 */

export {
  generateArtistPostDraft,
  DraftGenerationError,
  DRAFT_MODEL,
  type DraftContext,
  type DraftOutput,
} from "./generate";
