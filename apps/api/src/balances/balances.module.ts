import { Module } from '@nestjs/common';
import {
  BalancesController,
  MyBalancesController,
} from './balances.controller';
import { BalancesService } from './balances.service';

@Module({
  controllers: [BalancesController, MyBalancesController],
  providers: [BalancesService],
  exports: [BalancesService],
})
export class BalancesModule {}
