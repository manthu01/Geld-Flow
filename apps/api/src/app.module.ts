import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { LedgersModule } from './ledgers/ledgers.module';
import { ExpensesModule } from './expenses/expenses.module';
import { BalancesModule } from './balances/balances.module';
import { SettlementsModule } from './settlements/settlements.module';
import { ActivityModule } from './activity/activity.module';
import { ReputationModule } from './reputation/reputation.module';
import { DebtSimplificationModule } from './debt-simplification/debt-simplification.module';
import { ChecklistModule } from './checklist/checklist.module';
import { TelegramModule } from './telegram/telegram.module';
import { BadgesModule } from './badges/badges.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    AuthModule,
    LedgersModule,
    ExpensesModule,
    BalancesModule,
    SettlementsModule,
    ActivityModule,
    ReputationModule,
    DebtSimplificationModule,
    ChecklistModule,
    TelegramModule,
    BadgesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
