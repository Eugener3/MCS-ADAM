import { ApiProperty } from "@nestjs/swagger";

export class UserDto {
    @ApiProperty({
        example: '126f8002-a996-38e2-8c4c-a0467ba2bc13',
        description: 'Unique user-server ID',
    })
    public readonly userServerId: string;

    @ApiProperty({
        example: 'Bebrik',
        description: 'Users name',
    })
    public readonly name: string;
}