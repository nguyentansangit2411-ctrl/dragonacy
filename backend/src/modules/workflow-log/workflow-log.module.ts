import { Global, Module } from '@nestjs/common';
import { WorkflowLogService } from './workflow-log.service';
import { WorkflowLogController } from './workflow-log.controller';

@Global()
@Module({
  controllers: [WorkflowLogController],
  providers: [WorkflowLogService],
  exports: [WorkflowLogService],
})
export class WorkflowLogModule {}
