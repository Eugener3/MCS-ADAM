import { ApiProperty } from '@nestjs/swagger';
import { DefaultEntity } from 'src/common/entities/default.entity';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'telegrams' })
export class TelegramModel extends DefaultEntity {
  @ApiProperty({
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    description: 'Unique telegram ID',
  })
  @PrimaryColumn({ type: 'uuid', unique: true, generated: 'uuid' })
  public readonly id: string;

  @ApiProperty({ description: 'First name.' })
  @Column({ type: 'varchar', nullable: true })
  public readonly first_name: string | null;

  @ApiProperty({ description: 'Username.' })
  @Column({ type: 'varchar', nullable: true })
  public readonly username: string | null;

  @ApiProperty({ description: 'Telegram chat ID.' })
  @Column({ type: 'bigint', unique: true })
  public readonly chatId: number;

  @ApiProperty({ description: 'Subscription status.' })
  @Column({ type: 'boolean', default: false })
  public readonly isSubscribed: boolean;
}
