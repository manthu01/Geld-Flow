import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';
import { ReputationModule } from '../reputation/reputation.module';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [ReputationModule, BadgesModule],
  controllers: [SettlementsController],
  providers: [SettlementsService],
})
export class SettlementsModule {}
