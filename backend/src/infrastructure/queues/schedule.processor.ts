import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowLogService } from '../../modules/workflow-log/workflow-log.service';
import { CommandBus } from '@nestjs/cqrs';
import { TriggerAutoPostWorkflowCommand } from '../../modules/auto-post/commands/auto-post.commands';

@Processor('scheduler-check-queue')
export class ScheduleProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduleProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: WorkflowLogService,
    @InjectQueue('post-execution-queue') private readonly postQueue: Queue,
    private readonly commandBus: CommandBus,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<void> {
    this.logger.debug(`Running scheduled job checker: ${job.name}`);

    if (job.name === 'auto-post-workflow') {
      try {
        await this.commandBus.execute(new TriggerAutoPostWorkflowCommand());
        return;
      } catch (err: any) {
        this.logger.error('Error executing auto-post workflow job:', err);
        throw err;
      }
    }

    const now = new Date();

    try {
      // Find all pending schedules that are due (scheduled time <= current time)
      const dueSchedules = await this.prisma.schedule.findMany({
        where: {
          status: 'PENDING',
          postTime: {
            lte: now,
          },
        },
      });

      if (dueSchedules.length === 0) {
        return;
      }

      this.logger.log(`Found ${dueSchedules.length} due schedules to process.`);

      for (const schedule of dueSchedules) {
        // 1. Update status to PROCESSING to prevent double execution
        await this.prisma.schedule.update({
          where: { id: schedule.id },
          data: { status: 'PROCESSING' },
        });

        // 2. Queue the posting execution job in BullMQ
        await this.postQueue.add(
          'execute-post',
          { scheduleId: schedule.id },
          {
            attempts: 5, // retry limit
            backoff: {
              type: 'exponential',
              delay: 900000, // base delay of 15 minutes (900,000 ms)
            },
            removeOnComplete: true,
            removeOnFail: false, // keep failed jobs for debugging
          },
        );

        await this.logService.info(
          'SchedulerCheck',
          `Queued post execution for schedule: ${schedule.id}`,
          { scheduleId: schedule.id },
        );
      }
    } catch (error: any) {
      this.logger.error('Error executing scheduler check:', error);
      await this.logService.error(
        'SchedulerCheck',
        `Error executing scheduler check: ${error?.message || 'Unknown error'}`,
        error,
      );
      throw error;
    }
  }
}
