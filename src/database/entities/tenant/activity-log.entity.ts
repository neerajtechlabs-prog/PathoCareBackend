import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 100 })
  tenantId!: string;

  @Column('varchar', { length: 50 })
  type!: string;

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text')
  detail!: string;

  @Column('varchar', { length: 255, nullable: true })
  referenceId?: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'createdAt' })
  createdAt!: Date;
}
