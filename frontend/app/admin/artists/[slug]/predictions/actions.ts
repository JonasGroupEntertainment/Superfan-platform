"use server";

import { redirect } from "next/navigation";
import { resolvePrediction } from "@/lib/predictions/resolve";

export async function resolveAdminPredictionAction(formData: FormData) {
  const predictionId = formData.get("prediction_id") as string | null;
  const winningOutcomeId = formData.get("winning_outcome_id") as string | null;
  const artistSlug = formData.get("artist_slug") as string | null;

  if (!predictionId || !winningOutcomeId || !artistSlug) {
    throw new Error("Missing required fields");
  }

  await resolvePrediction({
    postId: predictionId,
    correctOptionId: winningOutcomeId,
  });

  redirect(`/admin/artists/${artistSlug}/predictions`);
}
