import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TestCatalog } from './test-catalog.entity';

@Entity('test_parameters')
export class TestParameter {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('uuid')
  testId: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 100, nullable: true })
  unit: string;

  @Column('varchar', { length: 100, nullable: true })
  referenceRange: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('uuid', { nullable: true })
  createdBy: string;

  @Column('uuid', { nullable: true })
  updatedBy: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => TestCatalog, test => test.parameters)
  @JoinColumn({ name: 'testId' })
  test: TestCatalog;
}
