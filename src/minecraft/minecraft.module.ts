import { Module } from '@nestjs/common';
import { MinecraftService } from './minecraft.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServerModel } from './models/server.model';
import { UserModel } from './models/user.model';

@Module({
  providers: [MinecraftService],
  imports: [
    TypeOrmModule.forFeature([
      ServerModel,
      UserModel,
    ])
  ],
  exports: [MinecraftService],
})
export class MinecraftModule {}
