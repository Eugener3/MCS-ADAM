import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerModel } from 'src/server/models/server.model';
import { UserModel } from 'src/users/models/user.model';
import { ServerService } from 'src/server/server.service';
import { EntityManager, FindOneOptions } from 'typeorm';
import { UserType } from './ro/user.ro';
import { UserDto } from './dto/user.dto';
import { TelegramService } from 'src/telegram/telegram.service';

@Injectable()
export class UsersService {
  private readonly name: string;
  private readonly logger = new Logger(ServerService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ServerService))
    private readonly serverService: ServerService,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
  ) {
    this.name = this.configService.getOrThrow('MINECRAFT_NAME');
  }

  async gets({
    status,
    manager,
  }: {
    status?: boolean;
    manager: EntityManager;
  }): Promise<UserType[]> {
    const options: FindOneOptions<UserModel> = {
      relations: {
        server: true,
      },
      where: { status },
    };
    const users = await manager.find(UserModel, options);

    return users.map((user) => UserType.from(user));
  }

  async get({
    name,
    manager,
  }: {
    name: string;
    manager: EntityManager;
  }): Promise<UserModel> {
    const options: FindOneOptions<UserModel> = {
      relations: {
        server: true,
      },
      where: [{ name }],
    };
    return manager.findOne(UserModel, options);
  }

  public async handleStatus(
    manager: EntityManager,
    currentPlayers: UserDto[],
  ): Promise<void> {
    const server = await this.serverService.getOrThrow({
      name: this.name,
      manager,
    });

    // Получаем пользователей из базы данных для текущего сервера
    const usersInDb = await this.gets({ manager });

    if (!usersInDb || usersInDb.length === 0) {
      console.log('No users found in DB for this server');
    } else {
      console.log(`Found ${usersInDb.length} users in DB for this server`);
    }

    for (let player of currentPlayers) {
      const userInDb = await this.get({ name: player.name, manager });
      if (!userInDb) {
        console.log(`User ${player.name} not found in DB, creating new one...`);
        await this.create(player, manager, server);
        this.logger.debug(`New user ${player.name} created with status true`);
      } else {
        if (!userInDb.status) {
          console.log(
            `User ${player.name} found in DB with status ${userInDb.status}, updating to true`,
          );
          await manager.update(
            UserModel,
            { userServerId: player.userServerId },
            { status: true },
          );
          const subs = await this.telegramService.getSubs({ manager, idUser: userInDb.id })
          for(let sub of subs) {
            await this.telegramService.sendPersonalMessage(`Игрок ${player.name} зашёл на сервер!!!`, sub.telegram.username);
          }
          this.logger.debug(`User ${player.name} status updated to true`);
        }
      }
    }

    for (const userInDb of usersInDb) {
      const playerInRequest = currentPlayers.find(
        (player) => player.name === userInDb.name,
      );

      if (userInDb.status && !playerInRequest) {
        console.log(
          `User ${userInDb.name} not in request, updating status to false`,
        );
        await manager.update(
          UserModel,
          { userServerId: userInDb.userServerId },
          { status: false },
        );
        this.logger.debug(`User ${userInDb.name} status updated to false`);
      }
    }
  }

  async create(
    user: UserDto,
    manager: EntityManager,
    server: ServerModel,
  ): Promise<void> {
    await manager.save(
      UserModel,
      manager.create(UserModel, {
        name: user.name,
        userServerId: user.userServerId,
        server,
      }),
    );
  }
}
