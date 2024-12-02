import { ApiProperty } from "@nestjs/swagger";
import { DefaultEntity } from "src/common/entities/default.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { ServerModel } from "../../server/models/server.model";

@Entity({ name: 'users' })
export class UserModel extends DefaultEntity {
	@ApiProperty({
		example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
		description: 'Unique user ID',
	})
	@PrimaryColumn({ type: 'uuid', unique: true, generated: 'uuid' })
	public readonly id: string;

	@ApiProperty({
		example: 'Ivanov Ivan Ivanovich',
		description: 'Full name of the user',
	})
	@Column({ type: 'varchar' })
	public readonly name: string;


	@ApiProperty({
		example: true,
		description: 'Status of the user',
	})
	@Column({ type: 'boolean', default: true })
	public readonly status: boolean;

    @ApiProperty({
        example: '126f8002-a996-38e2-8c4c-a0467ba2bc13',
        description: 'Unique user-server ID',
    })
    @Column({ type: 'varchar' })
    public readonly userServerId: string;

    @ManyToOne(() => ServerModel)
	@JoinColumn({ name: 'serverId' })
	public readonly server: ServerModel;
}
