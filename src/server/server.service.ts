import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JavaStatusResponse, status } from 'minecraft-server-util';
import { EntityManager, FindOneOptions } from 'typeorm';
import { ServerModel } from './models/server.model';
import { ServerDto, UserDto } from './dto/server.dto';
import { ServerType } from './ro/server.ro';
import { TelegramService } from 'src/telegram/telegram.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
@Injectable()
export class ServerService {
  private readonly logger = new Logger(ServerService.name);
  private readonly name: string;

  constructor(
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.name = this.configService.getOrThrow('MINECRAFT_NAME');
  }

  async get({
    name,
    manager,
  }: {
    name: string;
    manager: EntityManager;
  }): Promise<ServerModel | null> {
    const options: FindOneOptions<ServerModel> = {
      relations: {
        users: true,
      },
      where: [{ name }],
    };
    return await manager.findOne(ServerModel, options);
  }

  public async getOrThrow({
    name,
    manager,
  }: {
    name: string;
    manager: EntityManager;
  }): Promise<ServerModel> {
    const order = await this.get({ manager, name });
    if (!order) throw new NotFoundException('Server not found.');
    return order;
  }

  async create(
    manager: EntityManager,
    dto: JavaStatusResponse,
  ): Promise<ServerModel> {
    if (await this.get({ manager, name: dto.motd.clean }))
      throw new ConflictException('Such an item already exists');

    return await manager.save(
      ServerModel,
      manager.create(ServerModel, {
        name: dto.motd.clean,
        max: dto.players.max,
        status: false,
        online: dto.players.online,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    );
  }

  public async update(
    manager: EntityManager,
    server: ServerDto,
  ): Promise<void> {
    const existingServer = await this.getOrThrow({
      name: server.name,
      manager,
    });
    await manager.update(
      ServerModel,
      { id: existingServer.id },
      {
        max: server.max,
        online: server.online,
        status: server.status,
      },
    );
  }

  public async updateStatus(
    manager: EntityManager,
    status: boolean,
  ): Promise<void> {
    const existingServer = await this.getOrThrow({
      name: 'XUERVER',
      manager,
    });
    await manager.update(
      ServerModel,
      { id: existingServer.id },
      {
        status,
      },
    );
  }

  async checkServerStatus(
    manager: EntityManager,
    host: string,
    port: number,
  ): Promise<ServerType> {
    try {
      const serverResponse: JavaStatusResponse = await status(host, port, {
        timeout: 4000,
      });

      let server = await this.get({ manager, name: this.name });
      if (!server) {
        server = await this.create(manager, serverResponse);
        this.logger.debug(`Server ${this.name} created`);
      }
      const users: UserDto[] =
        serverResponse.players.sample?.map((player) => ({
          userServerId: player.id,
          name: player.name,
        })) || [];
      await this.usersService.handleStatus(manager, users);
      if (!server.status) {
        this.logger.debug(
          `Server status: ${server.status}\n SERVER WORKING NOW`,
        );
        await this.telegramService.sendBroadcastMessage(
          '🟢 Сервер успешно начинает работать!!! 🟢',
          true,
        );
        await manager.update(
          ServerModel,
          { name: this.name },
          { status: true, try: 0 },
        );
      }
      await manager.update(
        ServerModel,
        { id: server.id },
        {
          max: serverResponse.players.max,
          online: serverResponse.players.online,
        },
      );
      const resultServer = await this.getOrThrow({ name: this.name, manager });
      return resultServer;
    } catch (err) {
      const server = await this.getOrThrow({ manager, name: this.name });

      if (server.status) {
        if (server.try < 15) {
          this.logger.warn(
            `Server status: ${server.status}\n TRYING TO CONNECT...`,
          );
          await manager.update(
            ServerModel,
            { name: this.name },
            { try: server.try + 1 },
          );
        } else {
          this.logger.debug(
            `Server status: ${server.status}\n SERVER NOT WORKING NOW`,
          );
          await this.telegramService.sendBroadcastMessage(
            '❌ Сервер, к сожалению, приостановил работу((( ❌',
            true,
          );
          await manager.update(
            ServerModel,
            { name: this.name },
            { status: false },
          );
        }
      }
    }
  }
}
