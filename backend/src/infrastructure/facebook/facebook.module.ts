import { Module } from '@nestjs/common';
import { FacebookGraphClient } from '../../core/facebook/facebook-client.interface';
import { FacebookGraphClientImpl } from './facebook-graph.client';

@Module({
  providers: [
    {
      provide: FacebookGraphClient,
      useClass: FacebookGraphClientImpl,
    },
  ],
  exports: [FacebookGraphClient],
})
export class FacebookModule {}
