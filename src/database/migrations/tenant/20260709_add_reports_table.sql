CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY,
  bookingId UUID NOT NULL,
  reportType VARCHAR(50) NOT NULL DEFAULT 'RESULTS',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  publicToken VARCHAR(255) NULL,
  filePath VARCHAR(255) NULL,
  downloadUrl VARCHAR(255) NULL,
  errorMessage VARCHAR(255) NULL,
  requestedBy UUID NULL,
  generatedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_bookingId ON reports (bookingId);
CREATE INDEX IF NOT EXISTS idx_reports_publicToken ON reports (publicToken);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
