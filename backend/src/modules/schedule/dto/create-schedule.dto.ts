import { IsUUID, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ description: 'The UUID of the post draft to schedule', example: 'd3b07384-d113-43f7-b248-d3e9259837cd' })
  @IsUUID()
  @IsNotEmpty()
  postDraftId: string;

  @ApiProperty({ description: 'The UUID of the Facebook Page to post to', example: 'f3b89083-a773-45f8-9844-3d92f58e1c31' })
  @IsUUID()
  @IsNotEmpty()
  facebookPageId: string;

  @ApiProperty({ description: 'The ISO date time string at which to post', example: '2026-06-25T14:30:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  postTime: string;
}
