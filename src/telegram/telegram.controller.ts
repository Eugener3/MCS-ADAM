import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { BroadCastDto } from './dto/broadcast.dto';
import { DataSource } from 'typeorm';
import { AuthGuard } from 'src/common/guards/auth.guard';
import ResponseRo from 'src/common/ro/response.ro';
import { TelegramDto } from './dto/telegram.dto';

@UseGuards(AuthGuard)
@Controller('telegram')
export class TelegramController {
    constructor(
        private readonly telegramService: TelegramService,
        private readonly dataSource: DataSource,
    ) {}

    @Get('personal')
    public async personalMessage(@Query() { username, message }: TelegramDto): Promise<ResponseRo> {
        await this.telegramService.sendPersonalMessage(message, username);
        return {
            ok: true,
            message: 'Message sended successfully',
        }
    }

    @Get('broadcast')
    public async broadcastMessage(@Query() dto: BroadCastDto): Promise<ResponseRo> {
        await this.telegramService.sendBroadcastMessage(dto.message, dto.isSubscribed);
        return {
            ok: true,
            message: 'Message broadcasted successfully',
        }
    }
    @Get('list')
    public async telegrams(@Query() { isSubscribed }: BroadCastDto) {
        const telegrams = await this.telegramService.gets({ manager: this.dataSource.manager, isSubscribed });
        return {
            ok: true,
            result: telegrams,
        }
    }
}
