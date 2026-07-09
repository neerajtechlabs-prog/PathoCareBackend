import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Lab } from './lab.entity';

/**
 * Sample Type Entity
 * Represents types of samples (Blood, Urine, Saliva, etc.)
 */
@Entity('sample_types')
@Index(['labId', 'code'], { unique: true })
export class SampleType {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('uuid')
  labId!: string;

  @Column('varchar', { length: 100 })
  name!: string;

  @Column('varchar', { length: 50, unique: true })
  code!: string;

  /**
   * Container type (e.g., "EDTA tube", "SST tube", "Sterile cup")
   */
  @Column('varchar', { length: 100, nullable: true })
  container!: string;

  /**
   * Preservative used (e.g., "EDTA", "No additive", "Formalin")
   */
  @Column('varchar', { length: 100, nullable: true })
  preservative!: string;

  /**
   * Storage temperature requirement (e.g., "2-8°C", "Room temperature")
   */
  @Column('varchar', { length: 100, nullable: true })
  storageTemperature!: string;

  /**
   * Collection and handling instructions as JSON
   * Example:
   * {
   *   collectionInstructions: "Fast 12 hours before collection",
   *   minimumQuantity: "5 ml",
   *   maxStorageTime: "24 hours",
   *   handlingNotes: "Keep sample upright"
   * }
   */
  @Column('jsonb', { nullable: true, default: {} })
  instructions!: Record<string, any>;

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
  @ManyToOne(() => Lab, lab => lab.sampleTypes)
  @JoinColumn({ name: 'labId' })
  lab!: Lab;
}
