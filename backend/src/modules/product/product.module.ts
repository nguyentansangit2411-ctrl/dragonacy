import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductController } from './product.controller';
import { ProductCommandHandlers } from './commands/product.commands';
import { ProductQueryHandlers } from './queries/product.queries';

@Module({
  imports: [CqrsModule],
  controllers: [ProductController],
  providers: [
    ...ProductCommandHandlers,
    ...ProductQueryHandlers,
  ],
})
export class ProductModule {}
