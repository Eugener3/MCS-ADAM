import { ApiProperty } from "@nestjs/swagger";
import { ListTelegramsDto } from "./list.dto";

export class BroadCastDto extends ListTelegramsDto {
    @ApiProperty({
        default: 'default message',
        description: 'Message to broadcast',
    })
    message: string;
}