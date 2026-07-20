import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export enum BookingStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  CANCELLED = 'Cancelled',
  COMPLETED = 'Completed',
}

@Entity('bookings')
export class Booking {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('varchar', { length: 100, unique: true })
  bookingNumber!: string;

  @Column('uuid')
  patientId!: string;

  @Column('uuid', { nullable: true })
  doctorId?: string;

  @Column('varchar', { length: 50, default: BookingStatus.PENDING })
  status!: BookingStatus;

  @Column('text', { nullable: true })
  notes?: string;

  @Column('text', { nullable: true })
  cancellationRemark?: string;

  @Column('varchar', { length: 255, nullable: true })
  email?: string;

  @Column('varchar', { length: 20, nullable: true })
  phone?: string;

  @Column('varchar', { length: 50, nullable: true })
  paymentMode?: string;

  @Column('varchar', { length: 100, nullable: true })
  centre?: string;

  @Column('varchar', { length: 100, nullable: true })
  regNo?: string;

  @Column('varchar', { length: 100, nullable: true })
  barcode?: string;

  @Column('varchar', { length: 100, nullable: true })
  recordNo?: string;

  @Column('varchar', { length: 100, nullable: true })
  uid?: string;

  @Column('varchar', { length: 255, nullable: true })
  patientName?: string;

  @Column('varchar', { length: 50, nullable: true })
  patientTitle?: string;

  @Column('integer', { nullable: true })
  age?: number;

  @Column('varchar', { length: 50, nullable: true })
  ageUnit?: string;

  @Column('varchar', { length: 20, nullable: true })
  sex?: string;

  @Column('varchar', { length: 20, nullable: true })
  mobile?: string;

  @Column('varchar', { length: 255, nullable: true })
  area?: string;

  @Column('varchar', { length: 255, nullable: true })
  doctorPrintName?: string;

  @Column('varchar', { length: 255, nullable: true })
  doctorEmail?: string;

  @Column('varchar', { length: 100, nullable: true })
  doctorType?: string;

  @Column('varchar', { length: 100, nullable: true })
  bookingType?: string;

  @Column('varchar', { length: 255, nullable: true })
  sample?: string;

  @Column('varchar', { length: 100, nullable: true })
  takenBy?: string;

  @Column('varchar', { length: 255, nullable: true })
  panel?: string;

  @Column('varchar', { length: 100, nullable: true })
  fileNo?: string;

  @Column('varchar', { length: 100, nullable: true })
  userRate?: string;

  @Column('varchar', { length: 100, nullable: true })
  resultType?: string;

  @Column('boolean', { nullable: true })
  moveAllColumns?: boolean;

  @Column('boolean', { nullable: true })
  bookingPlusResult?: boolean;

  @Column('boolean', { nullable: true })
  bookingPlusReceipt?: boolean;

  @Column('boolean', { nullable: true })
  printWorkingSlip?: boolean;

  @Column('varchar', { length: 100, nullable: true })
  extraBy?: string;

  @Column('varchar', { length: 100, nullable: true })
  discountBy?: string;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  discount?: number;

  @Column('numeric', { precision: 5, scale: 2, default: 0 })
  discountPercent?: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  totalAmount?: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  amount!: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  paidAmount!: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  net?: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  paid?: number;

  @Column('boolean', { default: false })
  paymentVerified!: boolean;

  @Column('date', { nullable: true })
  preferredDate?: Date;

  @Column('date', { nullable: true })
  bookingDate?: Date;

  @Column('varchar', { length: 50, nullable: true })
  bookingTime?: string;

  @Column('uuid', { nullable: true })
  createdBy?: string;

  @Column('uuid', { nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
