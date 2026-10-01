import { Module } from '@nestjs/common';
import {
  ActivityController,
  ActivityFeedController,
} from './activity.controller';

@Module({
  controllers: [ActivityController, ActivityFeedController],
})
export class ActivityModule {}
