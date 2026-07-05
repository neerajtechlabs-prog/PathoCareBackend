# API Contract Documentation Sample

This document describes one implemented sample API endpoint from the PathCare backend project.

## Base URL

- Local development: http://localhost:3001/api
- Swagger UI: http://localhost:3001/api-docs

## Sample Endpoint: Health Check

### Purpose
This endpoint is used to verify that the backend API is running and reachable.

### Details
- Method: GET
- Route: /health
- Full URL: http://localhost:3001/api/health

### Request
No request body is required.

### Success Response
Status: 200 OK

```json
{
  "status": "ok",
  "timestamp": "2026-07-05T10:00:00.000Z"
}
```

### Response Fields
- status: string
  - Indicates the health status of the service.
- timestamp: string
  - ISO timestamp of the response generation time.

### Notes
- This endpoint is currently a basic health check placeholder.
- It is useful for smoke testing after starting the backend.

---

## How to Test in Postman

1. Open Postman.
2. Create a new GET request.
3. Enter the URL: http://localhost:3001/api/health
4. Click Send.
5. Review the response body.

---

## How to View API Details

- Swagger UI: http://localhost:3001/api-docs
- Swagger JSON: http://localhost:3001/api-docs-json

---

## Recommended Contract Template for Future Endpoints

Each future endpoint should include:
- Purpose
- Method
- Route
- Request headers
- Request body
- Query params
- Success response
- Error response
- Example payload
- Notes / validation rules
