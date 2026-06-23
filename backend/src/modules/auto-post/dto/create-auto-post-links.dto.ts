import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAutoPostLinksDto {
  @ApiProperty({ description: 'Danh sách các link sản phẩm cần đưa vào hàng đợi tự động', type: [String] })
  @IsArray()
  @IsString({ each: true })
  urls: string[];
}
