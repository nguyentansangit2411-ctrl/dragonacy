import { PartialType } from '@nestjs/swagger';
import { CreatePostDraftDto } from './create-post-draft.dto';

export class UpdatePostDraftDto extends PartialType(CreatePostDraftDto) {}
