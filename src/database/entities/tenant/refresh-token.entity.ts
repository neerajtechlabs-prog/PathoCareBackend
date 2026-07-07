import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'user_id' })
  userId!: string;

  @Column('text', { name: 'token_hash' })
  tokenHash!: string;

  @Column('varchar', { length: 50, name: 'family' })
  family!: string; // Token family for rotation chain tracking

  @Column('boolean', { name: 'revoked', default: false })
  revoked!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column('timestamp', { name: 'expires_at' })
  expiresAt!: Date;

  @Column('timestamp', { name: 'revoked_at', nullable: true })
  revokedAt?: Date;
}
