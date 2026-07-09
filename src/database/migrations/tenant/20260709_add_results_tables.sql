-- Tenant migration: add test_results and test_parameter_results tables
-- Run per-tenant schema (tenant_xxx)

CREATE TABLE IF NOT EXISTS test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  test_id uuid NOT NULL,
  status varchar(100),
  verified_by uuid,
  is_verified boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_parameter_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id uuid NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
  parameter_id uuid NOT NULL,
  value text,
  unit varchar(100),
  is_abnormal boolean DEFAULT false,
  is_critical boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Add numeric threshold columns to existing test_parameters table
ALTER TABLE IF EXISTS test_parameters
  ADD COLUMN IF NOT EXISTS normal_min double precision,
  ADD COLUMN IF NOT EXISTS normal_max double precision,
  ADD COLUMN IF NOT EXISTS critical_min double precision,
  ADD COLUMN IF NOT EXISTS critical_max double precision;

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_test_results_booking_id ON test_results(booking_id);
CREATE INDEX IF NOT EXISTS idx_param_results_test_result_id ON test_parameter_results(test_result_id);
