import { ApiProperty } from "@nestjs/swagger";
import { MessageDto } from "./message.dto";

export class BroadCastDto extends MessageDto {
    @ApiProperty({
        default: false,
        description: 'Whether to subscribe to the broadcast messages',
        required: false,
    })
    isSubscribed?: boolean;
}