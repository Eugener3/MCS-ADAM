import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, FindOneOptions } from 'typeorm';
import * as Bot from 'node-telegram-bot-api';
import { BotCommands } from './enums/bot-commands.enum';
import { ServerModel } from 'src/server/models/server.model';
import { TelegramModel } from './models/telegram.model';
import { UserType } from 'src/users/ro/user.ro';
import { RequestMessageService } from './request-message.service';
import { UsersService } from 'src/users/users.service';
import { ActionEnum } from './enums/action.enum';
import { UserModel } from 'src/users/models/user.model';
import { TelegramUserSubscriptionModel } from './models/telegram_user_subscription.model';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly bot: Bot;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly requestMessageService: RequestMessageService,
  ) {
    this.bot = new Bot(this.configService.getOrThrow('TG_TOKEN'), {
      polling: true,
    });
  }

  public async onModuleInit() {
    this.bot.onText(/\/start/, async (msg) => {
      await this.requestMessageService.handleStartCommand(this.bot, msg);
    });

    this.bot.on('message', async (msg) => {
      await this.handleMessage(msg);
    });
  }

  private async handleMessage(msg: any) {
    if (!msg.text) return;
    const chatId = msg.chat.id;
    return await this.dataSource.transaction(async (manager) => {
      const telegram = await manager.findOne(TelegramModel, {
        where: { chatId },
      });

      if (telegram?.currentAction === ActionEnum.AWAITING_FOLLOW_USERNAME) {
        const targetUsername = msg.text.trim();

        if (targetUsername === BotCommands.MENU) {
          await this.dataSource.manager.update(
            TelegramModel,
            { chatId: msg.chat.id },
            { currentAction: null },
          );
          await this.requestMessageService.handleStartMenu(this.bot, msg);
          return;
        }

        const targetUser = await this.usersService.get({
          manager: this.dataSource.manager,
          name: targetUsername,
        });
        if (!targetUser) {
          await this.bot.sendMessage(
            chatId,
            `Пользователь с никнеймом "${targetUsername}" не найден. Попробуйте снова или нажмите "Меню" для выбора действия.`,
          );
          return;
        }

        await this.subscribe(manager, telegram, targetUser);
        await this.dataSource.manager.update(
          TelegramModel,
          { chatId: msg.chat.id },
          { currentAction: null },
        );
        await this.bot.sendMessage(
          chatId,
          `Вы успешно подписались на пользователя "${targetUsername}". ✅`,
        );
        await this.requestMessageService.handleStartMenu(this.bot, msg);
        return;
      }

      if (telegram?.currentAction === ActionEnum.AWAITING_UNFOLLOW_USERNAME) {
        const targetUsername = msg.text.trim();

        if (targetUsername === BotCommands.MENU) {
          await this.dataSource.manager.update(
            TelegramModel,
            { chatId: msg.chat.id },
            { currentAction: null },
          );
          await this.requestMessageService.handleStartMenu(this.bot, msg);
          return;
        }

        const targetUser = await this.usersService.get({
          manager: this.dataSource.manager,
          name: targetUsername,
        });
        if (!targetUser) {
          await this.bot.sendMessage(
            chatId,
            `Пользователь с никнеймом "${targetUsername}" не найден. Попробуйте снова или нажмите "Меню" для выбора действия.`,
          );
          return;
        }

        await this.unsubscribe(
          manager,
          await this.getSub({
            manager,
            idTelegram: telegram.id,
            idUser: targetUser.id,
          }),
        );
        await this.dataSource.manager.update(
          TelegramModel,
          { chatId: msg.chat.id },
          { currentAction: null },
        );
        await this.bot.sendMessage(
          chatId,
          `Вы успешно отписались на пользователя "${targetUsername}". ✅`,
        );
        await this.requestMessageService.handleStartMenu(this.bot, msg);
        return;
      }

      switch (msg.text.trim()) {
        case BotCommands.STATUS:
          await this.requestMessageService.handleStatusCommand(this.bot, msg);
          break;
        case BotCommands.START:
          break;
        case BotCommands.SUBSCRIBE:
          await this.requestMessageService.handleSubscribeMenu(this.bot, msg);
          break;

        case BotCommands.SUBSCRIBE_ACTION:
          await this.requestMessageService.handleSubscribeAction(this.bot, msg);
          break;

        case BotCommands.UNSUBSCRIBE_ACTION:
          await this.requestMessageService.handleUnsubscribeAction(
            this.bot,
            msg,
          );
          break;

        case BotCommands.MENU:
          await this.requestMessageService.handleStartMenu(this.bot, msg);
          break;

        case BotCommands.SUBSCRIBE_USER:
          await this.requestMessageService.handleSubscribeUser(this.bot, msg);
          break;
        case BotCommands.FOLLOW_USER:
          await this.requestMessageService.followUser(this.bot, msg);
          break;
        case BotCommands.UNFOLLOW_USER:
          await this.requestMessageService.unfollowUser(this.bot, msg);
          break;
        default:
          await this.bot.sendMessage(
            msg.chat.id,
            'Извиниcь, я не понимаю эту команду.',
          );
          break;
      }
    });
  }

  public getActiveServerMessage(
    serverStatus: ServerModel,
    players: UserType[],
  ): string {
    const formattedDate = new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'Europe/Moscow',
    }).format(new Date(serverStatus.updated_at));
    return `Сервер ${serverStatus.name} активен! 🎉

Онлайн: ${serverStatus.online}/${serverStatus.max}
Игроки: ${players.map((player) => player.name).join(', ')}

Последнее обновление статуса: ${formattedDate}`;
  }

  public async sendBroadcastMessage(
    message: string,
    isSubscribed?: boolean,
  ): Promise<void> {
    return await this.dataSource.transaction(async (manager) => {
      // Получаем пользователей согласно условию
      const telegrams = await this.gets({ manager, isSubscribed });
      console.log(`Отправляем сообщение ${telegrams.length} пользователям.`);

      for (const telegram of telegrams) {
        try {
          await this.bot.sendMessage(telegram.chatId, message);
          console.log(`Сообщение отправлено пользователю ${telegram.chatId}`);
        } catch (error) {
          console.error(
            `Ошибка отправки сообщения пользователю ${telegram.chatId}:`,
            error.message,
          );

          if (error.response?.statusCode === 403) {
            await manager.delete(TelegramModel, { id: telegram.id });
            console.log(`Пользователь ${telegram.chatId} удалён.`);
          }
        }
      }
      console.log('Рассылка завершена.');
    });
  }

  public async sendPersonalMessage(
    message: string,
    username: string,
  ): Promise<void> {
    return await this.dataSource.transaction(async (manager) => {
      const telegram = await this.getOrThrow({ manager, username });

      try {
        await this.bot.sendMessage(telegram.chatId, message);
        console.log(`Сообщение отправлено пользователю ${telegram.chatId}`);
      } catch (error) {
        console.error(
          `Ошибка отправки сообщения пользователю ${telegram.chatId}:`,
          error.message,
        );

        if (error.response?.statusCode === 403) {
          await manager.delete(TelegramModel, { id: telegram.id });
          console.log(`Пользователь ${telegram.chatId} удалён.`);
        }
      }
    });
  }

  async gets({
    isSubscribed,
    manager,
  }: {
    isSubscribed?: boolean;
    manager: EntityManager;
  }): Promise<TelegramModel[]> {
    const options: FindOneOptions<TelegramModel> = {
      where: { isSubscribed },
    };

    return await manager.find(TelegramModel, options);
  }

  async get({
    username,
    manager,
  }: {
    username: string;
    manager: EntityManager;
  }): Promise<TelegramModel> {
    const options: FindOneOptions<TelegramModel> = {
      relations: {
        subscriptions: true,
      },
      where: { username },
    };

    return await manager.findOne(TelegramModel, options);
  }

  public async getOrThrow(params: {
    username: string;
    manager: EntityManager;
  }): Promise<TelegramModel> {
    const telegram = await this.get(params);
    if (!telegram) throw new NotFoundException('Telegram not found.');

    return telegram;
  }

  public async create(msg: any, manager: EntityManager) {
    return await manager.save(
      TelegramModel,
      manager.create(TelegramModel, {
        first_name: msg.from?.first_name || null,
        username: msg.from?.username || null,
        chatId: msg.chat.id,
      }),
    );
  }

  async getSub({
    manager,
    idUser,
    idTelegram,
  }: {
    manager: EntityManager;
    idUser: string;
    idTelegram: string;
  }): Promise<TelegramUserSubscriptionModel> {
    const options: FindOneOptions<TelegramUserSubscriptionModel> = {
      relations: {
        telegram: true,
        user: true,
      },
      where: { telegram: { id: idTelegram }, user: { id: idUser } },
    };

    return await manager.findOne(TelegramUserSubscriptionModel, options);
  }

  async getSubs({
    manager,
    idUser,
    idTelegram,
  }: {
    manager: EntityManager;
    idUser?: string;
    idTelegram?: string;
  }): Promise<TelegramUserSubscriptionModel[]> {
    const options: FindOneOptions<TelegramUserSubscriptionModel> = {
      relations: {
        telegram: true,
        user: true,
      },
      where: { telegram: { id: idTelegram }, user: { id: idUser } },
    };

    return await manager.find(TelegramUserSubscriptionModel, options);
  }

  private async subscribe(
    manager: EntityManager,
    telegram: TelegramModel,
    user: UserModel,
  ) {
    await manager.save(
      TelegramUserSubscriptionModel,
      manager.create(TelegramUserSubscriptionModel, {
        telegram,
        user,
      }),
    );
  }

  private async unsubscribe(
    manager: EntityManager,
    subscribe: TelegramUserSubscriptionModel,
  ) {
    await manager.delete(TelegramUserSubscriptionModel, { id: subscribe.id });
  }
}
