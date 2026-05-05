/**
 * Public surface of the onboarding-chat module.
 * Always import from "@/lib/onboarding-chat".
 */

export {
  nextAssistantMessage,
  ONBOARDING_MODEL,
  type ChatMessage,
  type NextTurnResult,
} from "./conversation";

export { extractFields, type ExtractedFields } from "./extract";
