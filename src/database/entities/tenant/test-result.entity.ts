import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Booking } from './booking.entity';
import { TestCatalog } from './test-catalog.entity';

@Entity('test_results')
export class TestResult {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('uuid')
  bookingId!: string;

  @Column('uuid')
  testId!: string;

  @Column('varchar', { length: 255, nullable: true })
  status!: string;

  @Column('uuid', { nullable: true })
  verifiedBy!: string | null;

  @Column('boolean', { default: false })
  isVerified!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'bookingId' })
  booking!: Booking;

  @ManyToOne(() => TestCatalog)
  @JoinColumn({ name: 'testId' })
  test!: TestCatalog;
}
