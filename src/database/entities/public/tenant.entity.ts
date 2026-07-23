import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tenants', schema: 'public' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug!: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ name: 'schema_name', type: 'varchar', length: 100, unique: true })
  schemaName!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'unverified',
    nullable: false,
    comment: 'Tenant lifecycle status: unverified → pending_approval → approved → provisioning → active',
  })
  status!: string;

  @Column({ name: 'admin_name', type: 'varchar', length: 255, nullable: true })
  adminName?: string | null;

  @Column({ name: 'admin_email', type: 'varchar', length: 255, nullable: true })
  adminEmail?: string | null;

  @Column({ name: 'admin_password_hash', type: 'varchar', length: 255, nullable: true })
  adminPasswordHash?: string | null;

  @Column({ name: 'otp_hash', type: 'varchar', length: 255, nullable: true })
  otpHash?: string | null;

  @Column({ name: 'otp_expires_at', type: 'timestamp', nullable: true })
  otpExpiresAt?: Date | null;

  @Column({ name: 'otp_attempts', type: 'int', default: 0, nullable: true })
  otpAttempts?: number | null;

  @Column({ name: 'otp_verified_at', type: 'timestamp', nullable: true })
  otpVerifiedAt?: Date | null;

  @Column({ name: 'lab_code_sent_at', type: 'timestamp', nullable: true })
  labCodeSentAt?: Date | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  @Column({ name: 'provisioned_at', type: 'timestamp', nullable: true })
  provisionedAt?: Date | null;

  @Column({ name: 'lab_code', type: 'varchar', length: 50, unique: true, nullable: true })
  labCode?: string | null;

  @Column({ name: 'registration_number', type: 'varchar', length: 100, nullable: true })
  registrationNumber?: string | null;

  @Column({ name: 'gst_number', type: 'varchar', length: 20, nullable: true })
  gstNumber?: string | null;

  @Column({ name: 'mobile_number', type: 'varchar', length: 20, nullable: true })
  mobileNumber?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string | null;

  @Column({ name: 'pin_code', type: 'varchar', length: 20, nullable: true })
  pinCode?: string | null;

  @Column({ name: 'complete_address', type: 'text', nullable: true })
  completeAddress?: string | null;

  @Column({ type: 'varchar', length: 50, default: 'Starter', nullable: true })
  plan?: string | null;

  @Column({ name: 'terms_accepted', type: 'boolean', default: false, nullable: true })
  termsAccepted?: boolean | null;

  @Column({ name: 'privacy_accepted', type: 'boolean', default: false, nullable: true })
  privacyAccepted?: boolean | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
