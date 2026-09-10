export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export type EmbeddingProviderResult = {
  embeddings: number[][];
  model: string;
};

export interface EmbeddingProvider {
  embedTexts(
    texts: string[],
    model: string,
    taskType?: EmbeddingTaskType,
  ): Promise<EmbeddingProviderResult>;
}
