import { forwardRef, Inject, Injectable } from '@nestjs/common';
import * as Bot from 'node-telegram-bot-api';
import { BotCommands } from './enums/bot-commands.enum';
import { DataSource } from 'typeorm';
import { ServerService } from 'src/server/server.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { TelegramService } from './telegram.service';
import { TelegramModel } from './models/telegram.model';
import { ActionEnum } from './enums/action.enum';

@Injectable()
export class RequestMessageService {
  private readonly name: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ServerService))
    private readonly serverService: ServerService,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
  ) {
    this.name = this.configService.getOrThrow('MINECRAFT_NAME');
  }

  public async handleStartMenu(bot: Bot, msg: any) {
    await bot.sendMessage(msg.chat.id, 'Выбирите действие', {
      reply_markup: {
        keyboard: [
          [
            { text: BotCommands.STATUS },
            { text: BotCommands.SUBSCRIBE },
            { text: BotCommands.START },
            { text: BotCommands.SUBSCRIBE_USER },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
    await this.dataSource.manager.update(
      TelegramModel,
      { chatId: msg.chat.id },
      { currentAction: ActionEnum.IN_MENU },
    );
  }

  public async handleStatusCommand(bot: Bot, msg: any) {
    const chatId = msg.chat.id;
    try {
      const serverStatus = await this.serverService.getOrThrow({
        name: this.name,
        manager: this.dataSource.manager,
      });
      const players = await this.usersService.gets({
        manager: this.dataSource.manager,
        status: true,
      });

      const message = serverStatus.status
        ? this.telegramService.getActiveServerMessage(serverStatus, players)
        : `Сервер ${serverStatus.name} не активен. 😞`;

      await bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Ошибка получения статуса сервера:', error.message);
      await bot.sendMessage(chatId, 'Сервер недоступен.');
    }
  }

  public async handleStartCommand(bot: Bot, msg: any) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const user = await manager.findOne(TelegramModel, {
          where: { chatId: msg.chat.id },
        });
        if (!user) {
          await this.telegramService.create(msg, manager);
        }
        const firstName = msg.from?.first_name || 'друг';
        const welcomeMessage = `Привет, ${firstName}! 👋
      
      Я отслеживаю статус Minecraft сервера. Нажми на кнопку "${BotCommands.STATUS}", чтобы узнать текущую информацию.`;

        await bot.sendMessage(msg.chat.id, welcomeMessage);
        await this.handleStartMenu(bot, msg);
      });
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error.message);
    }
  }

  public async handleSubscribeMenu(bot: Bot, msg: any) {
    const chatId = msg.chat.id;
    return await this.dataSource.transaction(async (manager) => {
      let user = await manager.findOne(TelegramModel, { where: { chatId } });
      if (!user) {
        user = await this.telegramService.create(msg, manager);
      }
      await bot.sendMessage(
        chatId,
        `Вы можете подписаться/отписаться на изменение статуса сервера!`,
      );
      const subscriptionButton = user.isSubscribed
        ? { text: BotCommands.UNSUBSCRIBE_ACTION }
        : { text: BotCommands.SUBSCRIBE_ACTION };
      const message = 'Выберите действие:';
      await bot.sendMessage(chatId, message, {
        reply_markup: {
          keyboard: [[subscriptionButton], [{ text: BotCommands.MENU }]],
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      });
    });
  }

  public async handleSubscribeAction(bot: Bot, msg: any) {
    const chatId = msg.chat.id;
      let telegram = await this.dataSource.getRepository(TelegramModel).findOne({
        where: { chatId },
      });
      if (!telegram) {
        telegram = await this.telegramService.create(msg, this.dataSource.manager);
      }
      await this.dataSource.getRepository(TelegramModel).update(
        { id: telegram.id },
        { isSubscribed: true },
      );
      await bot.sendMessage(chatId, 'Вы успешно подписались на обновления! ✅');
      await this.handleStartMenu(bot, msg);
  }

  public async handleUnsubscribeAction(bot: Bot, msg: any) {
    const chatId = msg.chat.id;
      let telegram = await this.dataSource.getRepository(TelegramModel).findOne({
        where: { chatId },
      });
      if (!telegram) {
        telegram = await this.telegramService.create(msg, this.dataSource.manager);
      }
      await this.dataSource.getRepository(TelegramModel).update({ id: telegram.id }, { isSubscribed: false });
      await bot.sendMessage(chatId, 'Вы отписались от обновлений. ❌');
      await this.handleStartMenu(bot, msg);
  }

  public async handleSubscribeUser(bot: Bot, msg: any) {
    const chatId = msg.chat.id;
    await this.dataSource.transaction(async (manager) => {
      let user = await manager.findOne(TelegramModel, {
        where: { chatId },
        relations: { subscriptions: { user: true } },
      });
      if (!user) {
        user = await this.telegramService.create(msg, manager);
      }

      await bot.sendMessage(
        chatId,
        `В данный момент вы следите за: \n${user.subscriptions
          .map((subscription) => {
            return (
              subscription.user.name +
              ' - ' +
              (subscription.user.status ? '🟢' : '🔴') +
              '\n'
            );
          })
          .join('')}`,
        {
          reply_markup: {
            keyboard: [
              [
                { text: BotCommands.UNFOLLOW_USER },
                { text: BotCommands.MENU },
                { text: BotCommands.FOLLOW_USER },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      );
    });
  }

  public async followUser(bot: Bot, msg: any) {
    const chatId = msg.chat.id;
    await this.dataSource.transaction(async (manager) => {
      let user = await manager.findOne(TelegramModel, {
        where: { chatId },
        relations: { subscriptions: { user: true } },
      });
      if (!user) {
        user = await this.telegramService.create(msg, manager);
      }

      await manager.update(
        TelegramModel,
        { id: user.id },
        { currentAction: ActionEnum.AWAITING_FOLLOW_USERNAME },
      );
    });

    await bot.sendMessage(
      chatId,
      'Пожалуйста, введите никнейм пользователя, за которым вы хотите следить:',
      {
        reply_markup: {
          keyboard: [[{ text: BotCommands.MENU }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    );
  }

  public async unfollowUser(bot: Bot, msg: any) {
    const chatId = msg.chat.id;
    await this.dataSource.transaction(async (manager) => {
      let user = await manager.findOne(TelegramModel, {
        where: { chatId },
        relations: { subscriptions: { user: true } },
      });
      if (!user) {
        user = await this.telegramService.create(msg, manager);
      }

      await manager.update(
        TelegramModel,
        { id: user.id },
        { currentAction: ActionEnum.AWAITING_UNFOLLOW_USERNAME },
      );
    });

    await bot.sendMessage(
      chatId,
      'Пожалуйста, введите никнейм пользователя, за которым вы хотите перестать следить:',
      {
        reply_markup: {
          keyboard: [[{ text: BotCommands.MENU }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    );
  }
}
