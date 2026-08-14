import { Module } from '@nestjs/common';
import { LedgersController } from './ledgers.controller';
import { InvitesController } from './invites.controller';
import { ClaimsController } from './claims.controller';
import { LedgersService } from './ledgers.service';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [BadgesModule],
  controllers: [LedgersController, InvitesController, ClaimsController],
  providers: [LedgersService],
  exports: [LedgersService],
})
export class LedgersModule {}
