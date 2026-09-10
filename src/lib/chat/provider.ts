export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatCompletionInput = {
  system: string;
  messages: ChatMessage[];
  model: string;
};

export type ChatCompletionResult = {
  answer: string;
  model: string;
};

export interface ChatProvider {
  complete(input: ChatCompletionInput): Promise<ChatCompletionResult>;
}
