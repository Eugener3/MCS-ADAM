import { Module } from '@nestjs/common';
import { ServerModule } from './server/server.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskService } from './task.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvFilePathModule } from './providers/envpiflepath.module';
import { PostgresModule } from './providers/postgres.module';
import { TelegramModule } from './telegram/telegram.module';
import { UsersModule } from './users/users.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ServerModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature(),
    EnvFilePathModule,
		PostgresModule,
    TelegramModule,
    UsersModule,
    StatsModule,
  ],
  providers: [TaskService]
})
export class AppModule {}
