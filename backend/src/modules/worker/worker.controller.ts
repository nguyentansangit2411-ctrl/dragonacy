import { Controller, Get, Post, Body, Param, NotFoundException, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@ApiTags('Local Worker')
@Controller('api/worker')
export class WorkerController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending schedules awaiting local worker execution' })
  async getPendingJobs() {
    const pendingSchedules = await this.prisma.schedule.findMany({
      where: {
        status: 'AWAITING_WORKER',
      },
      include: {
        facebookPage: true,
        postDraft: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        postTime: 'asc',
      },
    });

    return pendingSchedules.map((item) => ({
      id: item.id,
      postDraftId: item.postDraftId,
      content: item.postDraft.content,
      mediaUrls: item.postDraft.mediaUrls,
      productId: item.postDraft.product?.id || null,
      productName: item.postDraft.product?.title || null,
      affiliateUrl: item.postDraft.product?.affiliateUrl || null,
      facebookPageId: item.facebookPageId,
      pageId: item.facebookPage.pageId,
      pageName: item.facebookPage.pageName,
      scheduledTime: item.postTime,
      status: item.status,
      retryCount: item.retryCount,
      errorMessage: item.errorMessage,
      facebookPostId: item.facebookPostId,
      facebookCommentId: item.facebookCommentId,
    }));
  }

  @Post('jobs/:id/start')
  @ApiOperation({ summary: 'Lock and start a job' })
  async startJob(@Param('id', new ParseUUIDPipe()) id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule job ${id} not found.`);
    }

    if (schedule.status !== 'AWAITING_WORKER' && schedule.status !== 'PROCESSING') {
      throw new BadRequestException(`Schedule job ${id} is not in AWAITING_WORKER state (current: ${schedule.status}).`);
    }

    return this.prisma.schedule.update({
      where: { id },
      data: {
        status: 'PROCESSING',
      },
    });
  }

  @Post('jobs/:id/complete')
  @ApiOperation({ summary: 'Report successful job completion' })
  async completeJob(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { facebookPostId: string; facebookCommentId?: string },
  ) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule job ${id} not found.`);
    }

    return this.prisma.schedule.update({
      where: { id },
      data: {
        status: 'SUCCESS',
        facebookPostId: body.facebookPostId,
        facebookCommentId: body.facebookCommentId || null,
        errorMessage: null,
      },
    });
  }

  @Post('jobs/:id/fail')
  @ApiOperation({ summary: 'Report job failure' })
  async failJob(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { errorMessage: string },
  ) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule job ${id} not found.`);
    }

    return this.prisma.schedule.update({
      where: { id },
      data: {
        status: 'FAILED',
        errorMessage: body.errorMessage,
      },
    });
  }
}
