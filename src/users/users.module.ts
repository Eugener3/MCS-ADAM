import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { ServerModule } from 'src/server/server.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModel } from './models/user.model';
import { TelegramModule } from 'src/telegram/telegram.module';

@Module({
  providers: [UsersService],
  imports: [
    forwardRef(() => ServerModule),
    TypeOrmModule.forFeature([
      UserModel,
    ]),
    forwardRef(() => TelegramModule),
  ],
  exports: [UsersService],
})
export class UsersModule {}
