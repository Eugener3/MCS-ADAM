import { Injectable, Logger} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ServerService } from './server/server.service';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
@Injectable()
export class TaskService{
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly serverService: ServerService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,

  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleFiveSecondsCron() {
    const host = this.configService.getOrThrow('MINECRAFT_HOST');
    const port = this.configService.getOrThrow('MINECRAFT_PORT');

    const server = await this.dataSource.transaction(async (manager) => {
        return await this.serverService.checkServerStatus(manager, host, Number(port));
    });
    if (server) {
      this.logger.log(`Minecraft сервер ${server.name} активен.`);
      this.logger.log(`Игроков онлайн: ${server.online}/${server.max}.`);
    } else this.logger.warn('Minecraft сервер не отвечает.');
  }
}
