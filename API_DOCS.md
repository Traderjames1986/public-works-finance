# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints (except login/register) require JWT token in header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### POST /auth/register
Register a new user
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string",
  "role": "admin|finance_officer|accountant|engineer",
  "office_id": "string"
}
```

### POST /auth/login
Login user
```json
{
  "email": "string",
  "password": "string"
}
```
Response:
```json
{
  "token": "jwt_token",
  "user": { /* user details */ }
}
```

---

## Schemes Endpoints

### GET /schemes
Get all schemes for office

### GET /schemes/:id
Get scheme details with components and contracts

### POST /schemes
Create new scheme
```json
{
  "scheme_name": "string",
  "scheme_code": "string (optional)",
  "description": "string",
  "loan_no": "string (optional)"
}
```

### PUT /schemes/:id
Update scheme

### DELETE /schemes/:id
Delete scheme

---

## Components Endpoints

### POST /schemes/:scheme_id/components
Create component under scheme
```json
{
  "component_name": "string",
  "description": "string",
  "budget_amount": "decimal"
}
```

### POST /components/:component_id/sub-components
Create sub-component
```json
{
  "sub_component_name": "string",
  "description": "string",
  "budget_amount": "decimal"
}
```

### PUT /components/:id
Update component

### DELETE /components/:id
Delete component

---

## Contractors Endpoints

### GET /contractors
Get all contractors

### POST /contractors
Create new contractor
```json
{
  "contractor_name": "string",
  "contact_person": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "pan_no": "string"
}
```

### PUT /contractors/:id
Update contractor

### DELETE /contractors/:id
Delete contractor

---

## Contracts Endpoints

### POST /schemes/:scheme_id/contracts
Create contract
```json
{
  "contract_no": "string",
  "component_id": "uuid",
  "sub_component_id": "uuid (optional)",
  "contractor_id": "uuid",
  "contract_value": "decimal",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD"
}
```

### GET /schemes/:scheme_id/contracts
Get all contracts for scheme

### PUT /contracts/:id
Update contract

### DELETE /contracts/:id
Delete contract

---

## Fund Sources Endpoints

### GET /fund-sources
Get all fund sources for office

### POST /fund-sources
Create fund source
```json
{
  "source_name": "string",
  "source_type": "SASCI|STATE_BUDGET|OTHER"
}
```

### POST /fund-sources/:id/heads
Create fund share head
```json
{
  "head_name": "string"
}
```

### PUT /fund-sources/:id
Update fund source

### DELETE /fund-sources/:id
Delete fund source

---

## Fund Releases Endpoints

### POST /schemes/:scheme_id/fund-releases
Record fund release
```json
{
  "release_date": "YYYY-MM-DD",
  "release_amount": "decimal",
  "fund_source_id": "uuid",
  "release_no": "string",
  "notes": "string",
  "share_breakdown": [
    {
      "fund_share_head_id": "uuid",
      "share_amount": "decimal"
    }
  ]
}
```

### GET /schemes/:scheme_id/fund-releases
Get all fund releases for scheme

### PUT /fund-releases/:id
Update fund release

---

## Fund Transfers Endpoints

### POST /schemes/:scheme_id/transfers
Record fund transfer
```json
{
  "transfer_date": "YYYY-MM-DD",
  "from_account": "string",
  "to_account": "string",
  "transfer_amount": "decimal",
  "fund_release_id": "uuid (optional)",
  "transfer_mode": "FULL|INSTALLMENT",
  "notes": "string"
}
```

### GET /schemes/:scheme_id/transfers
Get all transfers for scheme

---

## Contractor Bills Endpoints

### POST /contracts/:contract_id/bills
Record contractor bill
```json
{
  "bill_date": "YYYY-MM-DD",
  "bill_number": "string",
  "work_done_value": "decimal",
  "cgst_amount": "decimal",
  "sgst_amount": "decimal",
  "igst_amount": "decimal",
  "labour_cess_amount": "decimal",
  "adhoc_withheld": "decimal",
  "csc_temporary_withheld": "decimal"
}
```
Note: gross_bill_amount and net_liability calculated automatically

### GET /contracts/:contract_id/bills
Get all bills for contract

### GET /schemes/:scheme_id/bills
Get all bills for scheme

### PUT /bills/:id
Update bill

---

## Payments Endpoints

### POST /bills/:bill_id/payments
Record payment
```json
{
  "payment_date": "YYYY-MM-DD",
  "payment_amount": "decimal",
  "payment_reference_no": "string",
  "payment_mode": "CHEQUE|NEFT|RTGS|CASH",
  "fund_source_id": "uuid",
  "fund_share_head_id": "uuid",
  "is_installment": "boolean",
  "installment_no": "integer",
  "total_installments": "integer",
  "statutory_deductions": [
    {
      "deduction_type": "CGST_TDS|SGST_TDS|IGST_TDS|RETENTION_MONEY|OTHER",
      "deduction_amount": "decimal",
      "deduction_rate": "decimal",
      "reason": "string"
    }
  ]
}
```

### GET /bills/:bill_id/payments
Get all payments for bill

### GET /schemes/:scheme_id/payments
Get all payments for scheme

---

## Cashbook Endpoints

### GET /cashbook
Get daily cashbook entries (filterable by date range)
```
Query params: start_date, end_date, scheme_id
```

### POST /cashbook
Create cashbook entry (usually auto-created from payments/transfers)

### GET /cashbook/closings
Get monthly cashbook closings

### POST /cashbook/closings
Create monthly closing
```json
{
  "closing_month": "YYYY-MM-01",
  "closing_balance": "decimal",
  "notes": "string"
}
```

---

## Reports Endpoints

### GET /reports/scheme-summary/:scheme_id
Get summary for single scheme
Returns: Fund received, transferred, paid, balance

### GET /reports/consolidated-summary
Get consolidated summary for all schemes

### GET /reports/fund-flow/:scheme_id
Get fund flow details for scheme

### GET /reports/payment-analysis/:scheme_id
Get payment analysis including statutory deductions

---

## Error Responses

All errors return:
```json
{
  "error": "error_message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Permission denied
- `CONFLICT`: Data conflict (e.g., duplicate)
