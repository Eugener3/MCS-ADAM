import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { MinecraftModule } from 'src/minecraft/minecraft.module';

@Module({
  providers: [TelegramService],
  imports: [MinecraftModule],
})
export class TelegramModule {}
