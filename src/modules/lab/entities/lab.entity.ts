import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Department } from './department.entity';
import { SampleType } from './sample-type.entity';

/**
 * Lab Profile Entity
 * Represents a pathology lab with configuration
 */
@Entity('labs')
export class Lab {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('varchar', { length: 255, unique: true })
  name!: string;

  @Column('text', { nullable: true })
  address!: string;

  @Column('varchar', { length: 20, nullable: true })
  phone!: string;

  @Column('varchar', { length: 255, nullable: true })
  email!: string;

  /**
   * Lab configuration as JSON
   * Example:
   * {
   *   businessHours: { open: "08:00", close: "20:00" },
   *   sampleCollectionEnabled: true,
   *   homeCollectionEnabled: true,
   *   reportDeliveryMethods: ["email", "sms", "whatsapp"],
   *   logo_url: "s3://...",
   *   website: "https://..."
   * }
   */
  @Column('jsonb', { nullable: true, default: {} })
  config!: Record<string, any>;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @Column('uuid', { nullable: true })
  createdBy!: string;

  @Column('uuid', { nullable: true })
  updatedBy!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  // Relations
  @OneToMany(() => Department, department => department.lab, { cascade: ['soft-remove'] })
  departments!: Department[];

  @OneToMany(() => SampleType, sampleType => sampleType.lab, { cascade: ['soft-remove'] })
  sampleTypes!: SampleType[];
}
