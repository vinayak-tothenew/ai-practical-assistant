import { CHROMA_DISTANCE_METRIC } from "./constants";

export function distanceToSimilarity(
  distance: number,
  metric: string = CHROMA_DISTANCE_METRIC,
): number {
  if (metric !== "cosine") {
    throw new Error(
      `Unsupported distance metric "${metric}". Expected cosine distance.`,
    );
  }

  return 1 - distance;
}
