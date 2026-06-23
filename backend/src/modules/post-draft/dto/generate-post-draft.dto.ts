import { IsUUID, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GeneratePostDraftDto {
  @ApiProperty({ description: 'The UUID of the product to generate the post draft for', example: 'a3d66fa8-4b77-4b14-9844-3d92f58e1c66' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Custom copywriter instructions (e.g., tone, focus points)', example: 'Focus on the 20% discount and make it high energy.', required: false })
  @IsString()
  @IsOptional()
  customInstruction?: string;
}
