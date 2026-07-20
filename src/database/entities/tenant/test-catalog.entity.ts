import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TestParameter } from './test-parameter.entity';

@Entity('tests')
export class TestCatalog {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('varchar', { length: 100, nullable: true })
  code!: string;

  @Column('varchar', { length: 255, nullable: true })
  department!: string;

  @Column('text', { nullable: true })
  description!: string;

  @Column('varchar', { length: 100, nullable: true })
  specimenType!: string;

  @Column('varchar', { length: 100, nullable: true })
  unit!: string;

  @Column('numeric', { precision: 10, scale: 2, nullable: true, name: 'Rate' })
  rate?: number;

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

  @OneToMany(() => TestParameter, parameter => parameter.test, { cascade: true })
  parameters!: TestParameter[];
}
