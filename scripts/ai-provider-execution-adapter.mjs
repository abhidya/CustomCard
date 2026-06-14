export const openAiCompatibleTextAdapterIds = [
  "deepseek-chat",
  "fireworks-chat",
  "groq-chat",
  "huggingface-chat",
  "mistral-chat",
  "perplexity-sonar-chat",
  "self-hosted-openai-compatible-chat",
  "together-chat",
  "xai-chat"
];

export function createAiProviderExecutionAdapter({
  textProviderExecutors,
  imageProviderExecutors,
  openAiCompatibleAdapter,
  executeOpenAiCompatibleTextProvider
}) {
  return {
    describe() {
      return {
        text: [...Object.keys(textProviderExecutors), ...openAiCompatibleTextAdapterIds].sort(),
        image: Object.keys(imageProviderExecutors).sort()
      };
    },

    async executeText(input) {
      const adapterId = input.flow.primaryAdapterId;
      const executor = textProviderExecutors[adapterId];
      if (executor) return executor(input);

      const compatible = openAiCompatibleAdapter(adapterId, input.env);
      if (compatible) return executeOpenAiCompatibleTextProvider(input, compatible);

      throw new Error(`Adapter ${adapterId} is configured but not executable in this runtime yet.`);
    },

    async executeImage(input) {
      const adapterId = input.flow.primaryAdapterId;
      const executor = imageProviderExecutors[adapterId];
      if (executor) return executor(input);
      throw new Error(`Image adapter ${adapterId} is configured but not executable in this runtime yet.`);
    }
  };
}
