import { ApiProperty } from "@nestjs/swagger";
import { AuthDto } from "../../common/dto/auth.dto";

export class MessageDto extends AuthDto {
    @ApiProperty({
        default: 'default message',
        description: 'Message to broadcast',
    })
    message: string;
}