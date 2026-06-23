import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AIModule } from './infrastructure/ai/ai.module';
import { MediaModule } from './infrastructure/media/media.module';
import { FacebookModule } from './infrastructure/facebook/facebook.module';
import { SecurityModule } from './infrastructure/security/security.module';
import { WorkflowLogModule } from './modules/workflow-log/workflow-log.module';
import { ProductModule } from './modules/product/product.module';
import { PostDraftModule } from './modules/post-draft/post-draft.module';
import { FacebookPageModule } from './modules/facebook-page/facebook-page.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { QueuesModule } from './infrastructure/queues/queues.module';
import { WorkerModule } from './modules/worker/worker.module';
import { AutoPostModule } from './modules/auto-post/auto-post.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CqrsModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const password = configService.get<string>('REDIS_PASSWORD');
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            ...(password ? { password } : {}),
          },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    SecurityModule,
    AIModule,
    MediaModule,
    FacebookModule,
    QueuesModule,
    WorkflowLogModule,
    ProductModule,
    PostDraftModule,
    FacebookPageModule,
    ScheduleModule,
    WorkerModule,
    AutoPostModule,
  ],
})
export class AppModule {}
