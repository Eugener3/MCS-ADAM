import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity, CreateDateColumn, Index, UpdateDateColumn } from 'typeorm';

export abstract class DefaultEntity extends BaseEntity {
	@ApiProperty({ description: 'Created at timestamp.' })
	@CreateDateColumn({
		type: 'timestamp',
		default: () => 'CURRENT_TIMESTAMP(6)',
	})
	@Index()
	public readonly created_at: string;

	@ApiProperty({ description: 'Updated at timestamp.' })
	@UpdateDateColumn({
		type: 'timestamp',
		default: () => 'CURRENT_TIMESTAMP(6)',
		onUpdate: 'CURRENT_TIMESTAMP(6)',
	})
	public readonly updated_at: string;
}
