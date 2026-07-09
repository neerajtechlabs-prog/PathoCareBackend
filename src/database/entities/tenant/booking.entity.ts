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
  bookingNumber: string;

  @Column('uuid')
  patientId: string;

  @Column('uuid', { nullable: true })
  doctorId: string;

  @Column('varchar', { length: 50, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column('text', { nullable: true })
  notes: string;

  @Column('varchar', { length: 255, nullable: true })
  email: string;

  @Column('varchar', { length: 20, nullable: true })
  phone: string;

  @Column('varchar', { length: 50, nullable: true })
  paymentMode: string;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column('boolean', { default: false })
  paymentVerified: boolean;

  @Column('date', { nullable: true })
  preferredDate: Date;

  @Column('uuid', { nullable: true })
  createdBy: string;

  @Column('uuid', { nullable: true })
  updatedBy: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
