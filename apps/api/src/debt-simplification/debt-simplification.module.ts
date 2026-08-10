import { Module } from '@nestjs/common';
import { DebtSimplificationController } from './debt-simplification.controller';
import { DebtSimplificationService } from './debt-simplification.service';
import { BalancesModule } from '../balances/balances.module';

@Module({
  imports: [BalancesModule],
  controllers: [DebtSimplificationController],
  providers: [DebtSimplificationService],
})
export class DebtSimplificationModule {}
