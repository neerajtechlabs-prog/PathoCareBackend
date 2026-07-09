import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('patients')
export class Patient {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('varchar', { length: 100, unique: true })
  uid!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('varchar', { length: 20, nullable: true })
  phone!: string;

  @Column('varchar', { length: 255, nullable: true })
  email!: string;

  @Column('varchar', { length: 20, nullable: true })
  gender!: string;

  @Column('date', { nullable: true })
  dateOfBirth!: Date;

  @Column('text', { nullable: true })
  address!: string;

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
}
