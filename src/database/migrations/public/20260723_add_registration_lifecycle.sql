-- Add admin registration and OTP lifecycle columns to public.tenants
-- This migration extends the tenant table to support the unverified → pending_approval → approved → provisioning → active flow

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS admin_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS otp_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS lab_code_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS lab_code VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_lab_code ON public.tenants (lab_code) WHERE lab_code IS NOT NULL;

-- Add CHECK constraint to enforce valid status values
ALTER TABLE public.tenants
ADD CONSTRAINT tenants_status_check CHECK (status IN ('unverified', 'pending_approval', 'approved', 'provisioning', 'active', 'provisioning_failed', 'suspended', 'expired'));

-- Update existing seeded tenants to 'active' to satisfy the constraint
UPDATE public.tenants SET status = 'active' WHERE status IS NULL OR status = '';
