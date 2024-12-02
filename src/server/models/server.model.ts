import { ApiProperty } from '@nestjs/swagger';
import { DefaultEntity } from 'src/common/entities/default.entity';
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { UserModel } from '../../users/models/user.model';

@Entity({ name: 'servers' })
export class ServerModel extends DefaultEntity {
	@ApiProperty({
		example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
		description: 'Unique server ID',
	})
	@PrimaryColumn({ type: 'uuid', unique: true, generated: 'uuid' })
	public readonly id: string;

	@ApiProperty({
		example: 10,
		description: 'Size of the server',
	})
	@Column({ type: 'int' })
	public readonly max: number;

	@ApiProperty({
		example: 2,
		description: 'Online on the server.',
	})
	@Column({ type: 'int' })
	public readonly online: number;

	@ApiProperty({
		example: 'Ivanov Ivan Ivanovich',
		description: 'Servers name',
	})
	@Column({ type: 'varchar', unique: true, })
	public readonly name: string;

	@ApiProperty({
		example: true,
		description: 'Status of the server',
	})
	@Column({ type: 'boolean' })
	public readonly status: boolean;

	@ApiProperty({ description: 'List of users' })
	@OneToMany(() => UserModel, (user) => user.server)
	public readonly users: UserModel[];

	// @OneToMany(() => OrderHistoryModel, (history) => history.order, {
	// 	cascade: true,
	// 	onDelete: 'CASCADE',
	// })
	// public readonly history: OrderHistoryModel[];
}
