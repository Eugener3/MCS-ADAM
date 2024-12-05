import { forwardRef, Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ServerModule } from 'src/server/server.module';
import { TelegramModel } from './models/telegram.model';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramController } from './telegram.controller';
import { UsersModule } from 'src/users/users.module';
import { TelegramUserSubscriptionModel } from './models/telegram_user_subscription.model';
import { RequestMessageService } from './request-message.service';

@Module({
  providers: [TelegramService, RequestMessageService],
  imports: [
    forwardRef(() => ServerModule),
    TypeOrmModule.forFeature([
      TelegramModel,
      TelegramUserSubscriptionModel,
    ]),
    forwardRef(() => UsersModule),
  ],
  exports: [TelegramService],
  controllers: [TelegramController],
})
export class TelegramModule {}
