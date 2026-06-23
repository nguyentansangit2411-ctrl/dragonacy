import { Module } from '@nestjs/common';
import { MediaUploadService } from '../../core/media/media-upload.interface';
import { CloudinaryMediaService } from './cloudinary.service';

@Module({
  providers: [
    {
      provide: MediaUploadService,
      useClass: CloudinaryMediaService,
    },
  ],
  exports: [MediaUploadService],
})
export class MediaModule {}
