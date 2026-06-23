import { Module } from '@nestjs/common';
import { AIProvider } from '../../core/ai/ai-provider.interface';
import { GeminiProProvider } from './gemini-pro.provider';

@Module({
  providers: [
    {
      provide: AIProvider,
      useClass: GeminiProProvider,
    },
  ],
  exports: [AIProvider],
})
export class AIModule {}
