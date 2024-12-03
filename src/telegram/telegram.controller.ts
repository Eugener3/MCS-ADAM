import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { BroadCastDto } from './dto/broadcast.dto';
import { DataSource } from 'typeorm';
import { ListTelegramsDto } from './dto/list.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import ResponseRo from 'src/common/ro/response.ro';

@UseGuards(AuthGuard)
@Controller('telegram')
export class TelegramController {
    constructor(
        private readonly telegramService: TelegramService,
        private readonly dataSource: DataSource,
    ) {}

    @Get('broadcast')
    public async broadcastMessage(@Query() dto: BroadCastDto): Promise<ResponseRo> {
        await this.telegramService.sendBroadcastMessage(dto.message, dto.isSubscribed);
        return {
            ok: true,
            message: 'Message broadcasted successfully',
        }
    }
    @Get('list')
    public async telegrams(@Query() { isSubscribed}: ListTelegramsDto) {
        const telegrams = await this.telegramService.gets({ manager: this.dataSource.manager, isSubscribed });
        return {
            ok: true,
            result: telegrams,
        }
    }
}
