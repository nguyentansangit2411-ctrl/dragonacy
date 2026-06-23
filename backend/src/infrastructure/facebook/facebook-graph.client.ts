import { Injectable, Logger } from '@nestjs/common';
import { FacebookGraphClient } from '../../core/facebook/facebook-client.interface';

export class FacebookApiException extends Error {
  constructor(
    public readonly code: number,
    public readonly type: string,
    message: string,
    public readonly fbtrace_id?: string,
  ) {
    super(message);
    this.name = 'FacebookApiException';
  }
}

@Injectable()
export class FacebookGraphClientImpl implements FacebookGraphClient {
  private readonly logger = new Logger(FacebookGraphClientImpl.name);
  private readonly apiVersion = 'v17.0';
  private readonly baseUrl = 'https://graph.facebook.com';

  async publishPost(
    pageId: string,
    accessToken: string,
    message: string,
    mediaUrls?: string[],
  ): Promise<{ postId: string }> {
    // 1. Check for mock mode triggers
    if (!accessToken || accessToken === 'invalid_token' || accessToken.startsWith('your_') || accessToken === 'invalid_key') {
      this.logger.warn('Mock mode: Invalid token detected, simulating token expired (Code 190).');
      throw new FacebookApiException(190, 'OAuthException', 'Error validating access token: Session has expired.', 'FBT_EXP_123');
    }

    if (message.includes('spam_trigger')) {
      this.logger.warn('Mock mode: Spam trigger detected, simulating spam block (Code 368).');
      throw new FacebookApiException(368, 'OAuthException', 'It looks like you were misusing this feature by going too fast.', 'FBT_SPM_999');
    }

    if (message.includes('trigger_rate_limit')) {
      this.logger.warn('Mock mode: Rate limit trigger detected, simulating temporary failure (Code 4).');
      throw new FacebookApiException(4, 'OAuthException', 'Application request limit reached.', 'FBT_RATE_LIMIT');
    }

    // 2. Real execution block
    try {
      if (mediaUrls && mediaUrls.length > 0) {
        if (mediaUrls.length === 1) {
          // Single image post: upload directly as a published photo with caption
          return this.publishSingleImagePost(pageId, accessToken, message, mediaUrls[0]);
        } else {
          // Multi-image post: upload photos as unpublished, then link them to a feed post
          return this.publishMultiImagePost(pageId, accessToken, message, mediaUrls);
        }
      } else {
        // Plain text feed post
        return this.publishFeedPost(pageId, accessToken, message);
      }
    } catch (error) {
      this.logger.error(`Error in publishPost for page ${pageId}:`, error);
      throw error;
    }
  }

  async publishComment(
    postId: string,
    accessToken: string,
    commentMessage: string,
  ): Promise<{ commentId: string }> {
    // 1. Mock Mode Check
    if (!accessToken || accessToken === 'invalid_token' || accessToken.startsWith('your_') || accessToken === 'invalid_key') {
      throw new FacebookApiException(190, 'OAuthException', 'Error validating access token.', 'FBT_EXP_123');
    }

    if (commentMessage.includes('fail_comment')) {
      this.logger.warn('Mock mode: Comment failure trigger detected.');
      throw new FacebookApiException(1, 'APIException', 'Unknown error occurred when posting comment.', 'FBT_COMM_ERR');
    }

    // 2. Real execution block
    const url = `${this.baseUrl}/${this.apiVersion}/${postId}/comments`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commentMessage,
          access_token: accessToken,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        this.handleFacebookError(data.error);
      }

      if (!data.id) {
        throw new Error('Facebook Comment response did not contain ID');
      }

      return { commentId: data.id };
    } catch (error) {
      this.logger.error(`Error publishing comment to post ${postId}:`, error);
      throw error;
    }
  }

  private async publishFeedPost(
    pageId: string,
    accessToken: string,
    message: string,
  ): Promise<{ postId: string }> {
    const url = `${this.baseUrl}/${this.apiVersion}/${pageId}/feed`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        access_token: accessToken,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      this.handleFacebookError(data.error);
    }

    if (!data.id) {
      throw new Error('Facebook Feed response did not contain ID');
    }

    return { postId: data.id };
  }

  private async publishSingleImagePost(
    pageId: string,
    accessToken: string,
    caption: string,
    imageUrl: string,
  ): Promise<{ postId: string }> {
    const url = `${this.baseUrl}/${this.apiVersion}/${pageId}/photos`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        caption: caption,
        access_token: accessToken,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      this.handleFacebookError(data.error);
    }

    if (!data.id) {
      throw new Error('Facebook Photo response did not contain ID');
    }

    // Note: Photo ID can act as the postId for comments
    return { postId: data.id };
  }

  private async publishMultiImagePost(
    pageId: string,
    accessToken: string,
    message: string,
    mediaUrls: string[],
  ): Promise<{ postId: string }> {
    const attachedMedia: { media_fbid: string }[] = [];

    // Upload each image as unpublished
    for (const url of mediaUrls) {
      const uploadUrl = `${this.baseUrl}/${this.apiVersion}/${pageId}/photos`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          published: false,
          access_token: accessToken,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        this.handleFacebookError(data.error);
      }

      if (data.id) {
        attachedMedia.push({ media_fbid: data.id });
      }
    }

    // Now post to feed referencing the uploaded photo IDs
    const feedUrl = `${this.baseUrl}/${this.apiVersion}/${pageId}/feed`;
    const response = await fetch(feedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        attached_media: attachedMedia,
        access_token: accessToken,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      this.handleFacebookError(data.error);
    }

    if (!data.id) {
      throw new Error('Facebook Multi-photo feed response did not contain ID');
    }

    return { postId: data.id };
  }

  private handleFacebookError(error: any): void {
    if (!error) {
      throw new Error('Unknown Facebook Graph API error');
    }

    const code = Number(error.code || 0);
    const type = error.type || 'Unknown';
    const message = error.message || 'No error message details';
    const fbtrace_id = error.fbtrace_id;

    throw new FacebookApiException(code, type, message, fbtrace_id);
  }
}
