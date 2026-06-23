import { Module } from '@nestjs/common';
import { FacebookPageController } from './facebook-page.controller';
import { FacebookModule } from '../../infrastructure/facebook/facebook.module';

@Module({
  imports: [FacebookModule],
  controllers: [FacebookPageController],
})
export class FacebookPageModule {}
