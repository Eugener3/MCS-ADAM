import { ApiProperty } from "@nestjs/swagger";
import { AuthDto } from "src/common/dto/auth.dto";

export class TelegramListDto extends AuthDto {
    @ApiProperty({
        default: false,
        description: 'Whether to subscribe to the broadcast messages',
        required: false,
    })
    isSubscribed?: boolean;
}