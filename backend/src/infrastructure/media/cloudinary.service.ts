import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { MediaUploadService } from '../../core/media/media-upload.interface';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryMediaService implements MediaUploadService {
  private readonly logger = new Logger(CloudinaryMediaService.name);
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (
      cloudName && cloudName !== 'your_cloudinary_cloud_name' &&
      apiKey && apiKey !== 'your_cloudinary_api_key' &&
      apiSecret && apiSecret !== 'your_cloudinary_api_secret'
    ) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isConfigured = true;
    } else {
      this.logger.warn('Cloudinary keys are not fully configured. CloudinaryMediaService will run in mock/simulation mode.');
    }
  }

  async uploadImage(
    fileData: Buffer | string,
    options?: Record<string, any>,
  ): Promise<{ url: string; publicId: string }> {
    if (!this.isConfigured) {
      const mockUrl = typeof fileData === 'string' && fileData.startsWith('http')
        ? fileData
        : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
      this.logger.log(`[Simulated Mode] Mocking image upload for URL or Buffer. Returning: ${mockUrl}`);
      return {
        url: mockUrl,
        publicId: `mock_public_id_${Date.now()}`,
      };
    }

    try {
      const folderName = options?.folder || 'dragonacy';

      if (typeof fileData === 'string') {
        // Upload remote URL directly
        const result: UploadApiResponse = await cloudinary.uploader.upload(fileData, {
          folder: folderName,
          resource_type: 'image',
        });
        return {
          url: result.secure_url,
          publicId: result.public_id,
        };
      } else {
        // Upload Buffer via Stream
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: folderName, resource_type: 'image' },
            (error, result) => {
              if (error) {
                this.logger.error('Cloudinary stream upload error:', error);
                return reject(error);
              }
              if (!result) {
                return reject(new Error('Cloudinary upload returned undefined response.'));
              }
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
              });
            },
          );

          const stream = new Readable();
          stream.push(fileData);
          stream.push(null);
          stream.pipe(uploadStream);
        });
      }
    } catch (error) {
      this.logger.error('Failed to upload image to Cloudinary:', error);
      throw error;
    }
  }
}
