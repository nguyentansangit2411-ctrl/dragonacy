import { Global, Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PostProcessor } from './post.processor';
import { ScheduleProcessor } from './schedule.processor';
import { FacebookModule } from '../facebook/facebook.module';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'post-execution-queue' },
      { name: 'scheduler-check-queue' },
    ),
    FacebookModule,
  ],
  providers: [PostProcessor, ScheduleProcessor],
  exports: [BullModule],
})
export class QueuesModule implements OnModuleInit {
  constructor(
    @InjectQueue('scheduler-check-queue') private readonly schedulerQueue: Queue,
  ) {}

  async onModuleInit() {
    // Add repeatable scheduler checker job running every 30 seconds
    try {
      // Clear existing repeatables first to avoid duplicates on hot-reloading
      const activeRepeatableJobs = await this.schedulerQueue.getRepeatableJobs();
      for (const rJob of activeRepeatableJobs) {
        await this.schedulerQueue.removeRepeatableByKey(rJob.key);
      }

      await this.schedulerQueue.add(
        'check-schedules',
        {},
        {
          repeat: {
            pattern: '*/30 * * * * *', // every 30 seconds cron pattern
          },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      console.log('Repeatable scheduler job successfully registered (runs every 30s).');

      await this.schedulerQueue.add(
        'auto-post-workflow',
        {},
        {
          repeat: {
            pattern: '0 0 8,12,17 * * *', // daily at 8:00, 12:00, 17:00
          },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      console.log('Repeatable auto-post workflow job successfully registered (runs daily at 8h, 12h, 17h).');
    } catch (error) {
      console.error('Failed to register repeatable scheduler job:', error);
    }
  }
}
