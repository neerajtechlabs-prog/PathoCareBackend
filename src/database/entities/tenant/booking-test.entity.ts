import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Booking } from './booking.entity';

@Entity('booking_tests')
export class BookingTest {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('uuid')
  bookingId: string;

  @Column('uuid')
  testId: string;

  @Column('varchar', { length: 100, nullable: true })
  testCode: string;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
