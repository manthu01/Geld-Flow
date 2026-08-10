import { Module } from '@nestjs/common';
import { LedgersController } from './ledgers.controller';
import { InvitesController } from './invites.controller';
import { LedgersService } from './ledgers.service';

@Module({
  controllers: [LedgersController, InvitesController],
  providers: [LedgersService],
  exports: [LedgersService],
})
export class LedgersModule {}
