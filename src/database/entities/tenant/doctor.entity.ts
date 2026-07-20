import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('doctors')
export class Doctor {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('varchar', { length: 50, nullable: true })
  doctorCode!: string;

  @Column('varchar', { length: 100, nullable: true })
  center!: string;

  @Column('varchar', { length: 20, nullable: true })
  initial!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('varchar', { length: 255, nullable: true })
  printName!: string;

  @Column('boolean', { default: true, nullable: true })
  isPrint!: boolean;

  @Column('varchar', { length: 100, nullable: true })
  designation!: string;

  @Column('varchar', { length: 255, nullable: true })
  organisation!: string;

  @Column('boolean', { default: false, nullable: true })
  isOrg!: boolean;

  @Column('varchar', { length: 50, nullable: true })
  religion!: string;

  @Column('varchar', { length: 255, nullable: true })
  specialization!: string;

  @Column('varchar', { length: 255, nullable: true })
  docLocation!: string;

  @Column('varchar', { length: 255, nullable: true })
  address1!: string;

  @Column('varchar', { length: 255, nullable: true })
  address2!: string;

  @Column('varchar', { length: 255, nullable: true })
  email!: string;

  @Column('varchar', { length: 20, nullable: true })
  phone1!: string;

  @Column('varchar', { length: 20, nullable: true })
  phone2!: string;

  @Column('varchar', { length: 20, nullable: true })
  mobile1!: string;

  @Column('varchar', { length: 20, nullable: true })
  mobile2!: string;

  @Column('varchar', { length: 100, nullable: true })
  userId!: string;

  @Column('varchar', { length: 255, nullable: true })
  password!: string;

  @Column('varchar', { length: 255, nullable: true })
  bookingSMS!: string;

  @Column('boolean', { default: false, nullable: true })
  isBooking!: boolean;

  @Column('varchar', { length: 255, nullable: true })
  resultSMS!: string;

  @Column('boolean', { default: false, nullable: true })
  isResult!: boolean;

  @Column('varchar', { length: 255, nullable: true })
  dayReminder!: string;

  @Column('boolean', { default: false, nullable: true })
  isReminder!: boolean;

  @Column('boolean', { default: false, nullable: true })
  isBdaySMS!: boolean;

  @Column('boolean', { default: false, nullable: true })
  isAnniversarySMS!: boolean;

  @Column('date', { nullable: true })
  birthDate!: Date;

  @Column('date', { nullable: true })
  anniversary!: Date;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  commission!: number;

  @Column('varchar', { length: 100, nullable: true })
  pro!: string;

  @Column('varchar', { length: 100, nullable: true })
  doctorType!: string;

  @Column('boolean', { default: false, nullable: true })
  webRpt!: boolean;

  @Column('boolean', { default: false, nullable: true })
  internetRpt!: boolean;

  @Column('boolean', { default: false, nullable: true })
  sms!: boolean;

  @Column('boolean', { default: false, nullable: true })
  whatsapp!: boolean;

  @Column('varchar', { length: 100, nullable: true })
  licenseNumber!: string;

  @Column('boolean', { default: true, nullable: true })
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
