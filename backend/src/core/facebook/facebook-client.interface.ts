export abstract class FacebookGraphClient {
  /**
   * Publishes a post to a Facebook Page.
   * Supports plain text or photo uploads (using media URL list).
   * @param pageId External Facebook Page ID
   * @param accessToken Page Access Token (decrypted)
   * @param message Post content text
   * @param mediaUrls Optional array of media URLs to attach
   * @returns The created Facebook post ID
   */
  abstract publishPost(
    pageId: string,
    accessToken: string,
    message: string,
    mediaUrls?: string[],
  ): Promise<{ postId: string }>;

  /**
   * Publishes a comment (typically an affiliate link) on an existing Facebook post.
   * @param postId Facebook Post ID (or object ID)
   * @param accessToken Page Access Token (decrypted)
   * @param commentMessage Comment message content
   * @returns The created Facebook comment ID
   */
  abstract publishComment(
    postId: string,
    accessToken: string,
    commentMessage: string,
  ): Promise<{ commentId: string }>;
}
