import { ApiProperty } from "@nestjs/swagger";
import { MessageDto } from "./message.dto";

export class TelegramDto extends MessageDto {
    @ApiProperty({ description: 'Username.' })
    public readonly username: string;
}