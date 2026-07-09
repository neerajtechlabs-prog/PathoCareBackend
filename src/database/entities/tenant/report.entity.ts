import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('reports')
export class Report {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('uuid')
  bookingId!: string;

  @Column('varchar', { length: 50, default: 'RESULTS' })
  reportType!: string;

  @Column('varchar', { length: 50, default: 'PENDING' })
  status!: string;

  @Column('varchar', { length: 255, nullable: true })
  publicToken!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  filePath!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  downloadUrl!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  errorMessage!: string | null;

  @Column('uuid', { nullable: true })
  requestedBy!: string | null;

  @Column('timestamp', { nullable: true })
  generatedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
