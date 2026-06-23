export interface FacebookGraphError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id: string;
}

export interface FacebookPostResponse {
  id: string;
}

export class FacebookGraphApiMock {
  private rateLimitCalls = 0;
  private maxRateLimitFailures = 0;

  constructor(maxRateLimitFailures = 0) {
    this.maxRateLimitFailures = maxRateLimitFailures;
  }

  /**
   * Configures how many times the API will throw a rate limit error before succeeding
   */
  public setMaxRateLimitFailures(count: number) {
    this.maxRateLimitFailures = count;
    this.rateLimitCalls = 0;
  }

  async publishPost(
    pageId: string,
    message: string,
    accessToken: string
  ): Promise<FacebookPostResponse> {
    this.validateToken(accessToken);

    if (message.includes("trigger_spam_block")) {
      const error: FacebookGraphError = {
        message: "It looks like you were misusing this feature by going too fast.",
        type: "OAuthException",
        code: 368,
        fbtrace_id: "fb_trace_spam_123"
      };
      throw new FacebookGraphException("Spam block triggered", error, 400);
    }

    if (message.includes("trigger_rate_limit") || this.rateLimitCalls < this.maxRateLimitFailures) {
      if (!message.includes("trigger_rate_limit")) {
        this.rateLimitCalls++;
      }
      const error: FacebookGraphError = {
        message: "Application request limit reached.",
        type: "OAuthException",
        code: 4,
        fbtrace_id: `fb_trace_rate_${this.rateLimitCalls}`
      };
      throw new FacebookGraphException("Rate limit reached", error, 403);
    }

    return {
      id: `${pageId}_post_${Date.now()}`
    };
  }

  async publishComment(
    postId: string,
    message: string,
    accessToken: string
  ): Promise<FacebookPostResponse> {
    this.validateToken(accessToken);

    if (message.includes("trigger_comment_fail")) {
      const error: FacebookGraphError = {
        message: "Unknown error posting comment.",
        type: "APIException",
        code: 1,
        fbtrace_id: "fb_trace_comment_fail"
      };
      throw new FacebookGraphException("Comment post failed", error, 500);
    }

    return {
      id: `${postId}_comment_${Date.now()}`
    };
  }

  private validateToken(accessToken: string) {
    if (!accessToken || accessToken === "expired_token_123") {
      const error: FacebookGraphError = {
        message: "Error validating access token: Session has expired.",
        type: "OAuthException",
        code: 190,
        error_subcode: 463, // Password changed or expired
        fbtrace_id: "fb_trace_token_expired"
      };
      throw new FacebookGraphException("Invalid or expired OAuth token", error, 401);
    }
  }
}

export class FacebookGraphException extends Error {
  constructor(
    message: string,
    public readonly response: FacebookGraphError,
    public readonly status: number
  ) {
    super(message);
    this.name = "FacebookGraphException";
  }
}
