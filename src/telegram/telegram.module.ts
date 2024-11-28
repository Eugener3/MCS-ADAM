import { forwardRef, Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { MinecraftModule } from 'src/minecraft/minecraft.module';
import { TelegramModel } from './models/telegram.model';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  providers: [TelegramService],
  imports: [
    forwardRef(() => MinecraftModule),
    TypeOrmModule.forFeature([
      TelegramModel,
    ]),
  ],
  exports: [TelegramService],
})
export class TelegramModule {}
