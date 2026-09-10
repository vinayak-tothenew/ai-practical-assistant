import { apiErrorSchema } from "@/lib/documents/types";

export function getApiErrorMessage(payload: unknown, fallback: string): string {
  const parsed = apiErrorSchema.safeParse(payload);
  return parsed.success ? parsed.data.error.message : fallback;
}
