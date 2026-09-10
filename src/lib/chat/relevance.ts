import type { SearchResult } from "../vector-store/types";

export function filterRelevantResults(
  results: SearchResult[],
  minSimilarity: number,
): SearchResult[] {
  return results.filter((result) => result.similarity >= minSimilarity);
}
