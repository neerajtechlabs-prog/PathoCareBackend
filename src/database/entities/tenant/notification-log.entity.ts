import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export enum NotificationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'channel', type: 'varchar', length: 20, default: NotificationChannel.EMAIL })
  channel!: NotificationChannel | string;

  @Column({ name: 'recipient_phone', type: 'varchar', length: 20, nullable: true })
  recipientPhone?: string | null;

  @Column({ name: 'recipient_email', type: 'varchar', length: 255, nullable: true })
  recipientEmail?: string | null;

  @Column({ name: 'notification_type', type: 'varchar', length: 50 })
  notificationType!: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: NotificationStatus.PENDING })
  status!: NotificationStatus | string;

  @Column({ name: 'subject', type: 'varchar', length: 255, nullable: true })
  subject?: string | null;

  @Column({ name: 'message', type: 'text', nullable: true })
  message?: string | null;

  @Column({ name: 'template', type: 'varchar', length: 255, nullable: true })
  template?: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 255, nullable: true })
  referenceId?: string | null;

  @Column({ name: 'provider_response', type: 'jsonb', nullable: true })
  providerResponse?: Record<string, any> | null;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
