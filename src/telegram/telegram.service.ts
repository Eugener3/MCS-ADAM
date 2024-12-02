import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerService } from 'src/server/server.service';
import { DataSource, EntityManager, FindOneOptions } from 'typeorm';
import * as Bot from 'node-telegram-bot-api';
import { BotCommands } from './enums/bot-commands.enum';
import { ServerModel } from 'src/server/models/server.model';
import { TelegramModel } from './models/telegram.model';
import { UsersService } from 'src/users/users.service';
import { UserType } from 'src/users/ro/user.ro';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private readonly name: string;
  private readonly bot: Bot;

  constructor(
    @Inject(forwardRef(() => ServerService))
    private readonly serverService: ServerService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.name = this.configService.getOrThrow('MINECRAFT_NAME');
    this.bot = new Bot(this.configService.getOrThrow('TG_TOKEN'), {
      polling: true,
    });
  }

  public async onModuleInit() {
    this.bot.onText(/\/start/, this.handleStartCommand.bind(this));

    this.bot.on('message', this.handleMessage.bind(this));
  }

  private async handleStartCommand(msg: any) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        let user = await manager.findOne(TelegramModel, {
          where: { chatId: msg.chat.id },
        });
        if (!user) {
          user = await this.create(msg, manager);
        }
        const firstName = msg.from?.first_name || 'друг';
        const welcomeMessage = `Привет, ${firstName}! 👋
  
  Я отслеживаю статус Minecraft сервера. Нажми на кнопку "${BotCommands.STATUS}", чтобы узнать текущую информацию.`;

        await this.bot.sendMessage(msg.chat.id, welcomeMessage);
        await this.handleStartMenu(msg);
      });
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error.message);
    }
  }

  private async handleMessage(msg: any) {
    if (!msg.text) return;

    const command = msg.text.trim();

    switch (command) {
      case BotCommands.STATUS:
        await this.handleStatusCommand(msg);
        break;
      case BotCommands.START:
        break;
      case BotCommands.SUBSCRIBE:
        await this.handleSubscribeMenu(msg);
        break;

      case BotCommands.SUBSCRIBE_ACTION:
        await this.handleSubscribeAction(msg);
        break;

      case BotCommands.UNSUBSCRIBE_ACTION:
        await this.handleUnsubscribeAction(msg);
        break;

      case BotCommands.MENU:
        await this.handleStartMenu(msg);
        break;

      default:
        await this.bot.sendMessage(
          msg.chat.id,
          'Извиниcь, я не понимаю эту команду.',
        );
        break;
    }
  }

  private async handleStartMenu(msg: any) {
    await this.bot.sendMessage(msg.chat.id, 'Выбирите действие', {
      reply_markup: {
        keyboard: [
          [
            { text: BotCommands.STATUS },
            { text: BotCommands.SUBSCRIBE },
            { text: BotCommands.START },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
  }

  private async handleStatusCommand(msg: any) {
    const chatId = msg.chat.id;
    try {
      const serverStatus = await this.serverService.getOrThrow({
        name: this.name,
        manager: this.dataSource.manager,
      });
      const players = await this.usersService.gets({ manager: this.dataSource.manager, status: true })

      const message = serverStatus.status
        ? this.getActiveServerMessage(serverStatus, players)
        : `Сервер ${serverStatus.name} не активен. 😞`;

      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Ошибка получения статуса сервера:', error.message);
      await this.bot.sendMessage(chatId, 'Сервер недоступен.');
    }
  }

  private async handleSubscribeMenu(msg: any) {
    const chatId = msg.chat.id;
    return await this.dataSource.transaction(async (manager) => {
      let user = await manager.findOne(TelegramModel, { where: { chatId } });
      if (!user) {
        user = await this.create(msg, manager);
      }
      await this.bot.sendMessage(
        chatId,
        `Вы можете подписаться/отписаться на изменение статуса сервера!`,
      );
      const subscriptionButton = user.isSubscribed
        ? { text: BotCommands.UNSUBSCRIBE_ACTION }
        : { text: BotCommands.SUBSCRIBE_ACTION };
      const message = 'Выберите действие:';
      await this.bot.sendMessage(chatId, message, {
        reply_markup: {
          keyboard: [[subscriptionButton], [{ text: BotCommands.MENU }]],
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      });
    });
  }

  private async handleSubscribeAction(msg: any) {
    const chatId = msg.chat.id;
    return await this.dataSource.transaction(async (manager) => {
      let user = await manager.findOne(TelegramModel, { where: { chatId } });
      if (!user) {
        user = await this.create(msg, manager);
      }
      await manager.update(
        TelegramModel,
        { id: user.id },
        { isSubscribed: true },
      );
      await this.bot.sendMessage(
        chatId,
        'Вы успешно подписались на обновления! ✅',
      );
      // Возвращаем пользователя в главное меню
      await this.handleStartMenu(msg);
    });
  }

  private async handleUnsubscribeAction(msg: any) {
    const chatId = msg.chat.id;
    return await this.dataSource.transaction(async (manager) => {
      let user = await manager.findOne(TelegramModel, { where: { chatId } });
      if (!user) {
        user = await this.create(msg, manager);
      }
      await manager.update(
        TelegramModel,
        { id: user.id },
        { isSubscribed: false },
      );
      await this.bot.sendMessage(chatId, 'Вы отписались от обновлений. ❌');
      // Возвращаем пользователя в главное меню
      await this.handleStartMenu(msg);
    });
  }

  private getActiveServerMessage(serverStatus: ServerModel, players: UserType[]): string {
    const formattedDate = new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'Europe/Moscow',
    }).format(new Date(serverStatus.updated_at));
    return `Сервер ${serverStatus.name} активен! 🎉

Онлайн: ${serverStatus.online}/${serverStatus.max}
Игроки: ${
  players.map(player =>{
    return player.name;
  })
}

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

          // Если нужно, можно обновить статус пользователя (например, отключить подписку)
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

      // Получаем пользователей согласно условию
      const telegram = await manager.findOne(TelegramModel, { where: { username } });
      if (!telegram)
        throw new NotFoundException('Telegram not found.');

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


  private async create(msg: any, manager: EntityManager) {
    return await manager.save(
      TelegramModel,
      manager.create(TelegramModel, {
        first_name: msg.from?.first_name || null,
        username: msg.from?.username || null,
        chatId: msg.chat.id,
      }),
    );
  }
}
