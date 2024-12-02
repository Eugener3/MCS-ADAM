import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { UserModel } from "src/users/models/user.model";

class ServerType {

	@ApiProperty({
		example: 'Ivanov Ivan Ivanovich',
		description: 'Servers name',
	})
	public name: string;

    @ApiProperty({
		example: 2,
		description: 'Online on the server.',
	})
	public online: number;

    @ApiProperty({
		example: 10,
		description: 'Maximum players on the server.',
	})
	public max: number;

    @ApiProperty({
		example: true,
		description: 'Status of the server',
	})
	public  status: boolean;

    @ApiProperty({ description: 'Created at timestamp.' })
	@Expose()
	public created_at: string;

	@ApiProperty({ description: 'Updated at timestamp.' })
	@Expose()
	public updated_at: string;
}

export class UserType {

	public static from(user: UserModel): Readonly<UserType> {
		const instance = new UserType();
		instance.name = user.name;
        instance.status = user.status;
        instance.server = user.server;
        instance.userServerId = user.userServerId;
		instance.created_at = new Date(user.created_at).toISOString();
		instance.updated_at = new Date(user.updated_at).toISOString();
		return instance;
	}

    @ApiProperty({
        example: '126f8002-a996-38e2-8c4c-a0467ba2bc13',
        description: 'Unique user-server ID',
    })
    public userServerId: string;

    @ApiProperty({
        example: 'Bebrik',
        description: 'Users name',
    })
    public name: string;

    @ApiProperty({
		example: true,
		description: 'Status of the user',
	})
	public status: boolean;

    @ApiProperty({
		example: ServerType,
		description: 'Server info.',
	})
	public server: ServerType;

    @ApiProperty({ description: 'Created at timestamp.' })
	@Expose()
	public created_at: string;

	@ApiProperty({ description: 'Updated at timestamp.' })
	@Expose()
	public updated_at: string;
}