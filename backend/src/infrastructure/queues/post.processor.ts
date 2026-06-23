import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowLogService } from '../../modules/workflow-log/workflow-log.service';

@Processor('post-execution-queue')
export class PostProcessor extends WorkerHost {
  private readonly logger = new Logger(PostProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: WorkflowLogService,
  ) {
    super();
  }

  async process(job: Job<{ scheduleId: string }, any, string>): Promise<void> {
    const { scheduleId } = job.data;
    this.logger.log(`Processing posting execution job for Schedule: ${scheduleId}`);

    // 1. Fetch the schedule with relations
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        facebookPage: true,
        postDraft: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!schedule) {
      this.logger.error(`Schedule ${scheduleId} not found in database. Aborting job.`);
      return;
    }

    // 2. Validate Page status
    if (!schedule.facebookPage.isActive) {
      const msg = `Target Facebook Page "${schedule.facebookPage.pageName}" is inactive. Quarantining job.`;
      this.logger.warn(msg);
      await this.prisma.schedule.update({
        where: { id: scheduleId },
        data: { status: 'FAILED', errorMessage: msg },
      });
      await this.logService.warn('PostExecution', msg, { scheduleId });
      return; // Do not throw, quarantine job
    }

    // Update retry count in database based on BullMQ attempt count (attemptsMade is 0-indexed)
    if (job.attemptsMade > 0) {
      await this.prisma.schedule.update({
        where: { id: scheduleId },
        data: { retryCount: job.attemptsMade },
      });
    }

    // 3. Update status to AWAITING_WORKER and wait for local runner
    await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        status: 'AWAITING_WORKER',
        errorMessage: null,
      },
    });

    const infoMsg = `Schedule transitioned to AWAITING_WORKER. Handed over to local worker.`;
    this.logger.log(infoMsg);
    await this.logService.info('PostExecution', infoMsg, { scheduleId });
  }
}
