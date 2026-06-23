import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleController } from './schedule.controller';
import { ScheduleCommandHandlers } from './commands/schedule.commands';
import { ScheduleQueryHandlers } from './queries/schedule.queries';
import { QueuesModule } from '../../infrastructure/queues/queues.module';

@Module({
  imports: [CqrsModule, QueuesModule],
  controllers: [ScheduleController],
  providers: [
    ...ScheduleCommandHandlers,
    ...ScheduleQueryHandlers,
  ],
})
export class ScheduleModule {}
