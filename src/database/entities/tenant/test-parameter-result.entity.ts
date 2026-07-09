import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TestResult } from './test-result.entity';
import { TestParameter } from './test-parameter.entity';

@Entity('test_parameter_results')
export class TestParameterResult {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('uuid')
  testResultId!: string;

  @Column('uuid')
  parameterId!: string;

  @Column('varchar', { length: 255, nullable: true })
  value!: string | null;

  @Column('varchar', { length: 100, nullable: true })
  unit!: string | null;

  @Column('boolean', { default: false })
  isAbnormal!: boolean;

  @Column('boolean', { default: false })
  isCritical!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => TestResult)
  @JoinColumn({ name: 'testResultId' })
  testResult!: TestResult;

  @ManyToOne(() => TestParameter)
  @JoinColumn({ name: 'parameterId' })
  parameter!: TestParameter;
}
