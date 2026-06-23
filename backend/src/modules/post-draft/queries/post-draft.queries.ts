import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { PostStatus } from '@prisma/client';

// Get single post draft query
export class GetPostDraftQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetPostDraftQuery)
export class GetPostDraftHandler implements IQueryHandler<GetPostDraftQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPostDraftQuery) {
    return this.prisma.postDraft.findUniqueOrThrow({
      where: { id: query.id },
      include: {
        product: true,
        schedules: {
          include: {
            facebookPage: true,
          },
        },
      },
    });
  }
}

// List post drafts query
export class ListPostDraftsQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number,
    public readonly status?: PostStatus,
    public readonly productId?: string,
  ) {}
}

@QueryHandler(ListPostDraftsQuery)
export class ListPostDraftsHandler implements IQueryHandler<ListPostDraftsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListPostDraftsQuery) {
    const { limit, offset, status, productId } = query;
    const parsedLimit = (limit === undefined || isNaN(Number(limit))) ? 20 : Number(limit);
    const parsedOffset = (offset === undefined || isNaN(Number(offset))) ? 0 : Number(offset);

    return this.prisma.postDraft.findMany({
      where: {
        status: status || undefined,
        productId: productId || undefined,
      },
      take: Math.min(parsedLimit, 100),
      skip: parsedOffset,
      include: {
        product: {
          select: {
            title: true,
            imageUrl: true,
            affiliateUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const PostDraftQueryHandlers = [
  GetPostDraftHandler,
  ListPostDraftsHandler,
];
