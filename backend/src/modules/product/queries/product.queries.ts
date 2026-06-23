import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

// Get single product query
export class GetProductQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetProductQuery)
export class GetProductHandler implements IQueryHandler<GetProductQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductQuery) {
    return this.prisma.product.findUniqueOrThrow({
      where: { id: query.id },
    });
  }
}

// List products query
export class ListProductsQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number,
    public readonly search?: string,
  ) {}
}

@QueryHandler(ListProductsQuery)
export class ListProductsHandler implements IQueryHandler<ListProductsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListProductsQuery) {
    const { limit, offset, search } = query;
    const parsedLimit = (limit === undefined || isNaN(Number(limit))) ? 20 : Number(limit);
    const parsedOffset = (offset === undefined || isNaN(Number(offset))) ? 0 : Number(offset);

    return this.prisma.product.findMany({
      where: search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      take: Math.min(parsedLimit, 100),
      skip: parsedOffset,
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const ProductQueryHandlers = [
  GetProductHandler,
  ListProductsHandler,
];
