import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { HealthModule } from './health/health.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
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
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
