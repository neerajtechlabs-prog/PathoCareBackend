import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Booking } from './booking.entity';

@Entity('booking_receipts')
export class BookingReceipt {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('varchar', { length: 100, unique: true })
  receiptNumber!: string;

  @Column('uuid')
  bookingId!: string;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  amount!: number;

  @Column('varchar', { length: 50 })
  paymentMode!: string;

  @Column('text', { nullable: true })
  remark?: string;

  @Column('uuid', { nullable: true })
  createdBy?: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking!: Booking;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
