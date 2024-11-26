import { ApiProperty } from "@nestjs/swagger";
import { JavaStatusResponse } from "minecraft-server-util";


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

export class ServerDto {
    public static toDto(response: JavaStatusResponse): Readonly<ServerDto> {
        return {
            name: response.motd.clean,
            online: response.players.online,
            status: true,
            max: response.players.max,
            users: response.players.sample?.map(player => ({
              userServerId: player.id,
              name: player.name,
            })) || [],
        };
    }

	@ApiProperty({
		example: 'Ivanov Ivan Ivanovich',
		description: 'Servers name',
	})
	public readonly name: string;

    @ApiProperty({
		example: 2,
		description: 'Online on the server.',
	})
	public readonly online: number;

    @ApiProperty({
		example: true,
		description: 'Status of the server',
	})
	public readonly status: boolean;

    @ApiProperty({
		example: 10,
		description: 'Maximum players on the server.',
	})
	public readonly max: number;

	@ApiProperty({
		example: [UserDto],
		description: 'Players info on the server.',
	})
	public readonly users: UserDto[];
}
