import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { ServerModule } from 'src/server/server.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModel } from './models/user.model';

@Module({
  providers: [UsersService],
  imports: [
    forwardRef(() => ServerModule),
    TypeOrmModule.forFeature([
      UserModel,
    ]),
  ],
  exports: [UsersService],
})
export class UsersModule {}
