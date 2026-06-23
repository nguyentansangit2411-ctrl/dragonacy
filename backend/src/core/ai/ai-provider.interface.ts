export abstract class AIProvider {
  /**
   * Generates promotional content from a product prompt.
   * @param prompt The prompt containing product title, description, and marketing parameters.
   * @param options Additional provider-specific configuration.
   * @returns Generated text and safety block check status.
   */
  abstract generateContent(
    prompt: string,
    options?: Record<string, any>,
  ): Promise<{ text: string; safetyBlocked: boolean }>;
}
