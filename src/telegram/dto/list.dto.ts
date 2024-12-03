import { ApiProperty } from "@nestjs/swagger";
import { TelegramsDto } from "./telegrams.dto";

export class ListTelegramsDto extends TelegramsDto {
    @ApiProperty({
        example: 'igo3g834n0g34n',
        description: 'Key to pass',
        required: true,
    })
    key: string;
}