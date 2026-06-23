export interface GeminiResponse {
  text: string;
  safetyBlocked: boolean;
}

export class GeminiAiMock {
  async generateContent(prompt: string, apiKey: string): Promise<GeminiResponse> {
    if (!apiKey || apiKey === "invalid_api_key") {
      throw new GeminiApiException("API_KEY_INVALID", "API key is invalid or not provided", 401);
    }

    if (prompt.includes("trigger_safety_block")) {
      return {
        text: "",
        safetyBlocked: true
      };
    }

    if (prompt.includes("trigger_timeout")) {
      // Simulate timeout
      await new Promise((resolve) => setTimeout(resolve, 2000));
      throw new GeminiApiException("GATEWAY_TIMEOUT", "Gemini API request timed out", 504);
    }

    // Default mock response
    return {
      text: `🚀 AI-Generated Post:\nDiscover this amazing deal!\n\nProduct Detail: ${prompt.substring(0, 50)}...\n\n👉 Buy here: {{affiliate_url}}`,
      safetyBlocked: false
    };
  }
}

export class GeminiApiException extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "GeminiApiException";
  }
}
