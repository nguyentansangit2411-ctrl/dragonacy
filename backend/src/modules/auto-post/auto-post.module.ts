import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AutoPostController } from './auto-post.controller';
import {
  CreateAutoPostLinksHandler,
  DeleteAutoPostLinkHandler,
  ClearAutoPostLinksHandler,
  TriggerAutoPostWorkflowHandler,
} from './commands/auto-post.commands';
import { ListAutoPostLinksHandler } from './queries/auto-post.queries';

@Module({
  imports: [CqrsModule],
  controllers: [AutoPostController],
  providers: [
    CreateAutoPostLinksHandler,
    DeleteAutoPostLinkHandler,
    ClearAutoPostLinksHandler,
    TriggerAutoPostWorkflowHandler,
    ListAutoPostLinksHandler,
  ],
})
export class AutoPostModule {}
