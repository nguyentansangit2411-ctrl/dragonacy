import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';

export class CreatePostDraftDto {
  @ApiProperty({ description: 'Optional ID of the associated product', example: 'a3d66fa8-4b77-4b14-9844-3d92f58e1c66', required: false })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({ description: 'The promotional content text of the post draft', example: '🔥 Get the best sound quality ever! 👇 Link in comments below!' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'List of media image URLs attached to the post', example: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e'], required: false })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  mediaUrls?: string[];

  @ApiProperty({ description: 'Status of the post draft', enum: PostStatus, default: PostStatus.DRAFT, required: false })
  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;
}
