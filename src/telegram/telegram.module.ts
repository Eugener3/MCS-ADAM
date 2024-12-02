import { forwardRef, Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ServerModule } from 'src/server/server.module';
import { TelegramModel } from './models/telegram.model';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  providers: [TelegramService],
  imports: [
    forwardRef(() => ServerModule),
    TypeOrmModule.forFeature([
      TelegramModel,
    ]),
  ],
  exports: [TelegramService],
})
export class TelegramModule {}
