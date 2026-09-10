import "server-only";

import { AppError } from "../../utils/errors";
import type { ChatConfig } from "../config";
import type { ChatProvider } from "../provider";
import { createGeminiChatProvider } from "./gemini";

export function createChatProvider(config: ChatConfig): ChatProvider {
  const provider = process.env.CHAT_PROVIDER?.trim().toLowerCase() || "gemini";

  if (provider === "gemini") {
    return createGeminiChatProvider(config);
  }

  throw new AppError(
    `Unsupported chat provider "${provider}". Set CHAT_PROVIDER=gemini.`,
    500,
    "CHAT_CONFIG_ERROR",
  );
}
