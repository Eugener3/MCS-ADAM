import { ApiProperty } from "@nestjs/swagger";

export class AuthDto {
    @ApiProperty({
        example: 'igo3g834n0g34n',
        description: 'Key to pass',
        required: true,
    })
    key: string;
}