import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Lab } from './lab.entity';

/**
 * Department Entity
 * Represents a department within a lab (e.g., Pathology, Radiology)
 */
@Entity('departments')
export class Department {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('uuid')
  labId!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('text', { nullable: true })
  description!: string;

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
  @ManyToOne(() => Lab, lab => lab.departments)
  @JoinColumn({ name: 'labId' })
  lab!: Lab;
}
