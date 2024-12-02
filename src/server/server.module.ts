import { forwardRef, Module } from '@nestjs/common';
import { ServerService } from './server.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServerModel } from './models/server.model';
import { TelegramModule } from 'src/telegram/telegram.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  providers: [ServerService],
  imports: [
    forwardRef(() => TelegramModule),
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature([
      ServerModel,
    ]),
  ],
  exports: [ServerService],
})
export class ServerModule {}
