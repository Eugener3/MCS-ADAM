import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TelegramModel } from './telegram.model';
import { UserModel } from 'src/users/models/user.model';
import { DefaultEntity } from 'src/common/entities/default.entity';

@Entity({ name: 'telegram_user_subscriptions' })
export class TelegramUserSubscriptionModel extends DefaultEntity {
  @ApiProperty({
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    description: 'Unique ID',
  })
  @PrimaryColumn({ type: 'uuid', unique: true, generated: 'uuid' })
  public readonly id: string;

  @ManyToOne(() => TelegramModel, (telegram) => telegram.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'telegramId' })
  public readonly telegram: TelegramModel;

  @ManyToOne(() => UserModel, (user) => user.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  public readonly user: UserModel;
}
