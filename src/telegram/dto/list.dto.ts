import { ApiProperty } from "@nestjs/swagger";

export class TelegramListDto {
    @ApiProperty({
        default: false,
        description: 'Whether to subscribe to the broadcast messages',
        required: false,
    })
    isSubscribed?: boolean;
}