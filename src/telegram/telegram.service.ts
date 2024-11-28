import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MinecraftService } from 'src/minecraft/minecraft.service';
import { DataSource } from 'typeorm';
import * as Bot from 'node-telegram-bot-api';
import { BotCommands } from './enums/bot-commands.enum';
import { ServerModel } from 'src/minecraft/models/server.model';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private readonly name: string;
  private readonly bot: Bot;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly minecraftService: MinecraftService,
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
      const firstName = msg.from?.first_name || 'друг';
      const welcomeMessage = `Привет, ${firstName}! 👋

Я отслеживаю статус Minecraft сервера. Нажми на кнопку "${BotCommands.STATUS}", чтобы узнать текущую информацию.`;

      await this.bot.sendMessage(msg.chat.id, welcomeMessage, {
        reply_markup: {
          keyboard: [[{ text: BotCommands.STATUS }]],
          resize_keyboard: true,
          one_time_keyboard: false,
        },
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

      default:
        await this.bot.sendMessage(msg.chat.id, 'Извиниcь, я не понимаю эту команду.');
        break;
    }
  }

  private async handleStatusCommand(msg: any) {
    const chatId = msg.chat.id;
    try {
      const serverStatus = await this.minecraftService.getOrThrow({
        name: this.name,
        manager: this.dataSource.manager,
      });

      const message = serverStatus.status
        ? this.getActiveServerMessage(serverStatus)
        : `Сервер ${serverStatus.name} не активен. 😞`;

      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Ошибка получения статуса сервера:', error.message);
      await this.bot.sendMessage(chatId, 'Сервер недоступен.');
    }
  }

  private getActiveServerMessage(serverStatus: ServerModel): string {
    const players =
      serverStatus.users.map((user) => user.name).join(', ') || 'Нет игроков';
    return `Сервер ${serverStatus.name} активен! 🎉

Онлайн: ${serverStatus.online}/${serverStatus.max}
Игроки: ${players}`;
  }
}
