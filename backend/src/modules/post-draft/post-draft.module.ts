import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PostDraftController } from './post-draft.controller';
import { PostDraftCommandHandlers } from './commands/post-draft.commands';
import { PostDraftQueryHandlers } from './queries/post-draft.queries';
import { AIModule } from '../../infrastructure/ai/ai.module';

@Module({
  imports: [CqrsModule, AIModule],
  controllers: [PostDraftController],
  providers: [
    ...PostDraftCommandHandlers,
    ...PostDraftQueryHandlers,
  ],
})
export class PostDraftModule {}
