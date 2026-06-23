import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export class ListAutoPostLinksQuery {}

@QueryHandler(ListAutoPostLinksQuery)
export class ListAutoPostLinksHandler implements IQueryHandler<ListAutoPostLinksQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.autoPostLink.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
