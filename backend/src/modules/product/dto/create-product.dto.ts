import { IsString, IsNotEmpty, IsOptional, IsUrl, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'The title of the affiliate product', example: 'Sony WH-1000XM4 Wireless Headphones' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Optional description of the product', example: 'Industry leading noise canceling headphones', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'The affiliate referral URL link', example: 'https://amzn.to/3xyzabc' })
  @IsUrl()
  @IsNotEmpty()
  affiliateUrl: string;

  @ApiProperty({ description: 'Optional product image CDN URL', example: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e', required: false })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: 'Optional raw content scraped from product page', example: 'Features: Bluetooth 5.0, 30hr battery...', required: false })
  @IsString()
  @IsOptional()
  rawContent?: string;

  @ApiProperty({ description: 'Additional dynamic metadata metadata json', example: { price: '$299', rating: 4.8 }, required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
