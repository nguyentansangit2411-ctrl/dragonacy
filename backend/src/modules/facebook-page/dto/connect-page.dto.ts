import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectPageDto {
  @ApiProperty({ description: 'The external Facebook Page ID', example: '10928374982734' })
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @ApiProperty({ description: 'The name of the Facebook Page', example: 'Amazing Gadgets & Affiliate Deals' })
  @IsString()
  @IsNotEmpty()
  pageName: string;
}
