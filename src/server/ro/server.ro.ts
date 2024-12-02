import { ApiProperty } from "@nestjs/swagger";
import ResponseRo from "src/common/ro/response.ro";
import { Expose, Type } from 'class-transformer';
import { ServerModel } from "../models/server.model";
import { UserModel } from "../models/user.model";

export class UserType {

	public static from(user: UserModel): Readonly<UserType> {
		const instance = new UserType();
		instance.name = user.name;
		instance.created_at = new Date(user.created_at).toISOString();
		instance.updated_at = new Date(user.updated_at).toISOString();
		return instance;
	}

    @ApiProperty({
        example: '126f8002-a996-38e2-8c4c-a0467ba2bc13',
        description: 'Unique user-server ID',
    })
    userServerId: string;

    @ApiProperty({
        example: 'Bebrik',
        description: 'Users name',
    })
    name: string;

    @ApiProperty({ description: 'Created at timestamp.' })
	@Expose()
	public created_at: string;

	@ApiProperty({ description: 'Updated at timestamp.' })
	@Expose()
	public updated_at: string;
}

export class ServerType {
	public static from(server: ServerModel): Readonly<ServerType> {
		const instance = new ServerType();
		instance.online = server.online;
		instance.max = server.max;
        instance.name = server.name;
        if (server.users)
			instance.users = server.users.map(UserType.from);
		instance.created_at = new Date(server.created_at).toISOString();
		instance.updated_at = new Date(server.updated_at).toISOString();
		return instance;
	}

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

	@ApiProperty({
		example: [UserType],
		description: 'Players info on the server.',
	})
	public users: UserType[];

    @ApiProperty({ description: 'Created at timestamp.' })
	@Expose()
	public created_at: string;

	@ApiProperty({ description: 'Updated at timestamp.' })
	@Expose()
	public updated_at: string;
}


export class ServerRo extends ResponseRo {
	@ApiProperty({
		description: 'Order data.',
		type: () => ServerType,
	})
	@Type(() => ServerType)
	@Expose()
	public declare readonly result: ServerType;
}