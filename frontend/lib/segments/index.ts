/**
 * Public surface of the segments module.
 * Always import from "@/lib/segments".
 */

export {
  type FanTier,
  FAN_TIERS,
  type SegmentFilter,
  type SegmentMatch,
  type SegmentRow,
} from "./types";

export {
  generateSegmentFilter,
  SegmentGenerationError,
  SEGMENT_MODEL,
} from "./generate";

export { evaluateSegment } from "./evaluate";
