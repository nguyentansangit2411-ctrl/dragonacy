import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

// List schedules query
export class ListSchedulesQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number,
    public readonly status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED',
  ) {}
}

@QueryHandler(ListSchedulesQuery)
export class ListSchedulesHandler implements IQueryHandler<ListSchedulesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListSchedulesQuery) {
    const { limit, offset, status } = query;
    const parsedLimit = (limit === undefined || isNaN(Number(limit))) ? 50 : Number(limit);
    const parsedOffset = (offset === undefined || isNaN(Number(offset))) ? 0 : Number(offset);

    const list = await this.prisma.schedule.findMany({
      where: status ? { status } : {},
      take: Math.min(parsedLimit, 200),
      skip: parsedOffset,
      include: {
        facebookPage: true,
        postDraft: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { postTime: 'desc' },
    });

    // Map flat response structure to match the Frontend Agent's requested contract
    return list.map(item => ({
      id: item.id,
      postDraftId: item.postDraftId,
      content: item.postDraft.content,
      mediaUrls: item.postDraft.mediaUrls,
      productId: item.postDraft.product?.id || null,
      productName: item.postDraft.product?.title || null,
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
}

export const ScheduleQueryHandlers = [
  ListSchedulesHandler,
];
