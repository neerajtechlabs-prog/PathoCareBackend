# Week 10 — PDF Report Engine

## What is implemented
- A new reports module with endpoints to request a report, check its status, and retrieve public verification details.
- Report metadata is persisted in the tenant-scoped reports table with a public token for shareable verification.
- PDF generation is handled asynchronously through the existing BullMQ report queue.
- The queue processor marks a report as completed or failed and stores the generated file path / public URL.

## Endpoints

### Authenticated report request
- POST /api/reports
- Requires: Bearer token + x-tenant-slug
- Body:
  ```json
  {
    "bookingId": "<booking-id>",
    "reportType": "RESULTS",
    "patientEmail": "patient@example.com",
    "patientPhone": "+911234567890"
  }
  ```

### Authenticated status lookup
- GET /api/reports/:id
- Requires: Bearer token + x-tenant-slug

### Public verification endpoint
- GET /api/reports/public/:token
- Requires: x-tenant-slug
- Returns the report status and any generated download URL.

## Curl examples

### Request a report
```bash
curl -X POST http://localhost:3001/api/reports \
  -H "Authorization: Bearer <access-token>" \
  -H "x-tenant-slug: demo" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"<booking-id>","reportType":"RESULTS"}'
```

### Check authenticated status
```bash
curl http://localhost:3001/api/reports/<report-id> \
  -H "Authorization: Bearer <access-token>" \
  -H "x-tenant-slug: demo"
```

### Public verification
```bash
curl http://localhost:3001/api/reports/public/<public-token> \
  -H "x-tenant-slug: demo"
```

## Architecture notes
- The flow is intentionally lightweight and production-safe: report creation and status tracking happen in the tenant schema, while PDF generation runs asynchronously.
- For production, swap the placeholder PDF generation step with a real Puppeteer or HTML-to-PDF renderer and upload the artifact to S3 or object storage.
