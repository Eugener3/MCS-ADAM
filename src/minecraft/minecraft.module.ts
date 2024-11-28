import { forwardRef, Module } from '@nestjs/common';
import { MinecraftService } from './minecraft.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServerModel } from './models/server.model';
import { UserModel } from './models/user.model';
import { TelegramModule } from 'src/telegram/telegram.module';

@Module({
  providers: [MinecraftService],
  imports: [
    forwardRef(() => TelegramModule),
    TypeOrmModule.forFeature([
      ServerModel,
      UserModel,
    ]),
  ],
  exports: [MinecraftService],
})
export class MinecraftModule {}
