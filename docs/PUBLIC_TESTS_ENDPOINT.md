# Public tests endpoint

## Endpoint
- GET /public/tests
- GET /api/public/tests

## Purpose
Returns the active test catalog rows from the public schema so the frontend can load the shared test list without depending on tenant-specific data.

## Response shape
Each item includes:
- id
- name
- code
- department
- description
- specimenType
- unit
- isActive
