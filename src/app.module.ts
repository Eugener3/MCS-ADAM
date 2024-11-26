import { Module } from '@nestjs/common';
import { MinecraftModule } from './minecraft/minecraft.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskService } from './task.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvFilePathModule } from './providers/envpiflepath.module';
import { PostgresModule } from './providers/postgres.module';

@Module({
  imports: [
    MinecraftModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature(),
    EnvFilePathModule,
		PostgresModule,
  ],
  providers: [TaskService]
})
export class AppModule {}
