export abstract class MediaUploadService {
  /**
   * Uploads an image from a URL or Buffer to a CDN (e.g. Cloudinary) and returns the optimized URL.
   * @param fileData File buffer or remote URL to fetch and upload
   * @param options Upload configuration parameters
   * @returns Optimized image CDN URL
   */
  abstract uploadImage(
    fileData: Buffer | string,
    options?: Record<string, any>,
  ): Promise<{ url: string; publicId: string }>;
}
