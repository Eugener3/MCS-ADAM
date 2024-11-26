import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { status } from 'minecraft-server-util';
import { DataSource, EntityManager, FindOneOptions } from 'typeorm';
import { ServerModel } from './models/server.model';
import { ServerDto } from './dto/server.dto';
import { ServerType } from './ro/server.ro';
import { UserModel } from './models/user.model';
import * as Bot from 'node-telegram-bot-api';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MinecraftService {
  private readonly logger = new Logger(MinecraftService.name);
  private readonly bot: Bot;
  private readonly callback: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.bot = new Bot(this.configService.getOrThrow('TG_TOKEN'), {
      polling: true,
    });
    this.callback = this.configService.getOrThrow('TELEGRAM_CALLBACK');
  }

  public async onModuleInit() {
    // Обработка команд /start
    this.bot.onText(/\/start/, async (msg) => {
      try {
        await this.bot.sendMessage(
          msg.chat.id,
          `Привет, ${msg.from?.first_name || 'друг'}! 👋

Я отслеживаю статус Minecraft сервера. Нажми на кнопку "Инфа о сервере 📊", чтобы узнать текущую информацию.`,
          {
            reply_markup: {
              keyboard: [
                [{ text: 'Инфа о сервере 📊' }], // Кнопка в основной панели
              ],
              resize_keyboard: true, // Автоматическая подстройка под размер экрана
              one_time_keyboard: false, // Клавиатура остаётся на экране
            },
          },
        );
      } catch (error) {
        console.error('Ошибка отправки сообщения:', error.message);
      }
    });

    // Обработка нажатия кнопки "Инфа о сервере"
    this.bot.on('message', async (msg) => {
      if (msg.text === 'Инфа о сервере 📊') {
        const chatId = msg.chat.id;
        try {
          // Получение статуса сервера через MinecraftService
          const serverStatus = await this.getOrThrow({
            name: 'XUERVER',
            manager: this.dataSource.manager,
          });

          await this.bot.sendMessage(
            chatId,
            `Сервер ${serverStatus.name} активен!\n
Онлайн: ${serverStatus.online}/${serverStatus.max}\n
Игроки: ${serverStatus.users.map((user) => user.name).join(', ') || 'Нет игроков'}`,
          );
        } catch (error) {
          await this.bot.sendMessage(chatId, 'Сервер недоступен.');
        }
      }
    });
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

  async create(manager: EntityManager, dto: ServerDto): Promise<ServerModel> {
    if (await this.get({ manager, name: dto.name }))
      throw new ConflictException('Such an item already exists');

    return await manager.save(
      ServerModel,
      manager.create(ServerModel, {
        name: dto.name,
        max: dto.max,
        status: dto.status,
        online: dto.online,
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

  public async updateUsers(
    manager: EntityManager,
    server: ServerDto,
    currentPlayers: ServerDto['users'],
  ): Promise<void> {
    const existingServer = await this.getOrThrow({
      manager,
      name: server.name,
    });

    const existingUserIds = existingServer.users.map((user) => user.id);
    const currentPlayerIds = currentPlayers.map(
      (player) => player.userServerId,
    );

    // Удаляем игроков, которых больше нет на сервере
    const usersToRemove = existingServer.users.filter(
      (user) => !currentPlayerIds.includes(user.id),
    );

    for (const user of usersToRemove) {
      await manager.delete(UserModel, { id: user.id });
    }

    // Добавляем новых игроков
    const usersToAdd = currentPlayers.filter(
      (player) => !existingUserIds.includes(player.userServerId),
    );

    for (const player of usersToAdd) {
      await manager.save(
        UserModel,
        manager.create(UserModel, {
          id: player.userServerId,
          name: player.name,
          userServerId: player.userServerId,
          server: existingServer,
        }),
      );
    }
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
      const response = await status(host, port, { timeout: 5000 });
      const dto: ServerDto = {
        name: response.motd.clean,
        online: response.players.online,
        status: true,
        max: response.players.max,
        users:
          response.players.sample?.map((player) => ({
            userServerId: player.id,
            name: player.name,
          })) || [],
      };
      const existingServer = await this.get({
        manager: this.dataSource.manager,
        name: dto.name,
      });

      if (!existingServer) {
        const newServer = await this.create(manager, dto);
        const newDto: ServerDto = {
          name: response.motd.clean,
          online: response.players.online,
          status: true,
          max: response.players.max,
          users:
            response.players.sample?.map((player) => ({
              userServerId: player.id,
              name: player.name,
            })) || [],
        };
        await this.updateUsers(manager, newDto, dto.users);
        await this.updateStatus(manager, true);
        return ServerType.from(newServer);
      } else {
        await this.update(manager, dto);
        await this.updateUsers(manager, dto, dto.users);
        await this.updateStatus(manager, true);
        return ServerType.from(
          await this.get({
            manager: this.dataSource.manager,
            name: dto.name,
          }),
        );
      }
    } catch (error) {
      await this.updateStatus(manager, false);
      this.logger.error(`Сервер недоступен: ${error.message}`);
      throw new InternalServerErrorException('Сервер недоступен');
    }
  }
}
