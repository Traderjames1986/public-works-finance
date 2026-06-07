# Database Schema Documentation

## Tables Overview

### 1. users
- `id` (UUID): Primary key
- `username` (VARCHAR): Unique username
- `email` (VARCHAR): Unique email
- `password_hash` (VARCHAR): Hashed password
- `full_name` (VARCHAR): Full name
- `role` (VARCHAR): admin, finance_officer, accountant, engineer
- `office_id` (VARCHAR): Office identifier
- `is_active` (BOOLEAN): Account status
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

### 2. schemes
- `id` (UUID): Primary key
- `scheme_code` (VARCHAR): Optional scheme code
- `scheme_name` (VARCHAR): Scheme name (REQUIRED)
- `description` (TEXT): Scheme description
- `loan_no` (VARCHAR): Optional loan number
- `office_id` (VARCHAR): Office identifier
- `status` (VARCHAR): active, inactive
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 3. components
- `id` (UUID): Primary key
- `scheme_id` (UUID): Foreign key to schemes
- `component_name` (VARCHAR): Component name (REQUIRED)
- `description` (TEXT): Description
- `budget_amount` (DECIMAL): Budget allocated
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 4. sub_components
- `id` (UUID): Primary key
- `component_id` (UUID): Foreign key to components
- `sub_component_name` (VARCHAR): Name (REQUIRED)
- `description` (TEXT): Description
- `budget_amount` (DECIMAL): Budget
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 5. contractors
- `id` (UUID): Primary key
- `contractor_name` (VARCHAR): Contractor name (REQUIRED)
- `contact_person` (VARCHAR): Contact person name
- `email` (VARCHAR): Email address
- `phone` (VARCHAR): Phone number
- `address` (TEXT): Physical address
- `pan_no` (VARCHAR): PAN number
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 6. contracts
- `id` (UUID): Primary key
- `contract_no` (VARCHAR): Contract number (REQUIRED)
- `scheme_id` (UUID): Foreign key to schemes
- `component_id` (UUID): Foreign key to components
- `sub_component_id` (UUID): Foreign key to sub_components (optional)
- `contractor_id` (UUID): Foreign key to contractors (REQUIRED)
- `contract_value` (DECIMAL): Total contract value
- `start_date` (DATE): Contract start date
- `end_date` (DATE): Contract end date
- `status` (VARCHAR): active, completed, cancelled
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 7. fund_sources
- `id` (UUID): Primary key
- `office_id` (VARCHAR): Office identifier
- `source_name` (VARCHAR): Source name (REQUIRED) - e.g., SASCI, STATE BUDGET
- `source_type` (VARCHAR): SASCI, STATE_BUDGET, OTHER
- `is_active` (BOOLEAN): Status
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 8. fund_share_heads
- `id` (UUID): Primary key
- `office_id` (VARCHAR): Office identifier
- `head_name` (VARCHAR): Head name (REQUIRED) - e.g., STATE SHARE, CENTRAL SHARE
- `fund_source_id` (UUID): Foreign key to fund_sources
- `is_active` (BOOLEAN): Status
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 9. fund_releases
- `id` (UUID): Primary key
- `scheme_id` (UUID): Foreign key to schemes (REQUIRED)
- `release_date` (DATE): Date of fund release (REQUIRED)
- `release_amount` (DECIMAL): Total amount released (REQUIRED)
- `fund_source_id` (UUID): Foreign key to fund_sources (REQUIRED)
- `release_no` (VARCHAR): Release reference number
- `notes` (TEXT): Additional notes
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 10. fund_share_breakdown
- `id` (UUID): Primary key
- `fund_release_id` (UUID): Foreign key to fund_releases (REQUIRED)
- `fund_share_head_id` (UUID): Foreign key to fund_share_heads (REQUIRED)
- `share_amount` (DECIMAL): Amount for this share (REQUIRED) - User decided, must sum to release_amount
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 11. fund_transfers
- `id` (UUID): Primary key
- `scheme_id` (UUID): Foreign key to schemes (REQUIRED)
- `transfer_date` (DATE): Date of transfer (REQUIRED)
- `from_account` (VARCHAR): Source account (e.g., SASCI Bank Account)
- `to_account` (VARCHAR): Destination account (e.g., Project Account)
- `transfer_amount` (DECIMAL): Transfer amount (REQUIRED)
- `fund_release_id` (UUID): Foreign key to fund_releases (optional)
- `transfer_mode` (VARCHAR): FULL, INSTALLMENT
- `notes` (TEXT): Notes
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 12. contractor_bills
- `id` (UUID): Primary key
- `contract_id` (UUID): Foreign key to contracts (REQUIRED)
- `bill_date` (DATE): Date of bill/SPS (REQUIRED)
- `bill_number` (VARCHAR): Bill/SPS number (REQUIRED)
- `work_done_value` (DECIMAL): Value of work done (REQUIRED)
- `cgst_amount` (DECIMAL): CGST amount
- `sgst_amount` (DECIMAL): SGST amount
- `igst_amount` (DECIMAL): IGST amount
- `labour_cess_amount` (DECIMAL): Labour cess amount
- `gross_bill_amount` (DECIMAL): Gross bill = work_done_value + taxes
- `adhoc_withheld` (DECIMAL): Adhoc withheld amount
- `csc_temporary_withheld` (DECIMAL): CSC temporary withheld amount
- `net_liability` (DECIMAL): Net payable = gross_bill_amount - adhoc_withheld - csc_temporary_withheld
- `bill_status` (VARCHAR): pending, submitted, under_review, approved, rejected
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 13. bill_adjustments
- `id` (UUID): Primary key
- `contractor_bill_id` (UUID): Foreign key to contractor_bills
- `adjustment_type` (VARCHAR): ADHOC_WITHHELD, CSC_TEMPORARY_WITHHELD
- `adjustment_amount` (DECIMAL): Amount
- `reason` (TEXT): Reason for adjustment
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 14. payments
- `id` (UUID): Primary key
- `contractor_bill_id` (UUID): Foreign key to contractor_bills (REQUIRED)
- `payment_date` (DATE): Payment date (REQUIRED)
- `payment_amount` (DECIMAL): Amount paid (REQUIRED)
- `payment_reference_no` (VARCHAR): Payment reference/cheque number
- `payment_mode` (VARCHAR): CHEQUE, NEFT, RTGS, CASH
- `fund_source_id` (UUID): Foreign key to fund_sources
- `fund_share_head_id` (UUID): Foreign key to fund_share_heads
- `is_installment` (BOOLEAN): If payment is installment
- `installment_no` (INTEGER): Installment number
- `total_installments` (INTEGER): Total installments
- `notes` (TEXT): Notes
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 15. statutory_deductions
- `id` (UUID): Primary key
- `payment_id` (UUID): Foreign key to payments
- `deduction_type` (VARCHAR): CGST_TDS, SGST_TDS, IGST_TDS, RETENTION_MONEY, OTHER
- `deduction_amount` (DECIMAL): Deduction amount (REQUIRED)
- `deduction_rate` (DECIMAL): Rate of deduction (e.g., 2, 5, 10)
- `reason` (TEXT): Reason for deduction
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 16. cashbook
- `id` (UUID): Primary key
- `office_id` (VARCHAR): Office identifier
- `entry_date` (DATE): Date of entry (REQUIRED)
- `entry_type` (VARCHAR): RECEIPT, PAYMENT, TRANSFER
- `description` (VARCHAR): Description (REQUIRED)
- `reference_id` (UUID): Reference to payment/transfer/receipt
- `reference_type` (VARCHAR): payment, transfer, fund_release
- `debit_amount` (DECIMAL): Amount in
- `credit_amount` (DECIMAL): Amount out
- `balance` (DECIMAL): Running balance
- `scheme_id` (UUID): Foreign key to schemes (optional)
- `notes` (TEXT): Notes
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 17. cashbook_closings
- `id` (UUID): Primary key
- `office_id` (VARCHAR): Office identifier
- `closing_month` (DATE): Month of closing (YYYY-MM-01)
- `opening_balance` (DECIMAL): Opening balance
- `closing_balance` (DECIMAL): Closing balance
- `total_receipts` (DECIMAL): Total receipts in month
- `total_payments` (DECIMAL): Total payments in month
- `notes` (TEXT): Closing notes
- `closed_by` (UUID): Foreign key to users
- `closed_at` (TIMESTAMP): Closing timestamp
- `created_at` (TIMESTAMP)

## Indexes

- Primary keys on all id columns
- Foreign key indexes on all relationship columns
- Unique indexes on scheme_code, contract_no, bill_number
- Index on scheme_id for quick lookups
- Index on office_id for office-wise filtering
- Index on entry_date for cashbook queries

## Relationships

```
schemes (1) ─── (many) components ─── (many) sub_components
    │
    ├── (many) contracts ─── (1) contractors
    │
    ├── (many) fund_releases ─── (many) fund_share_breakdown
    │
    └── (many) fund_transfers

contractors (1) ─── (many) contracts ─── (many) contractor_bills ─── (many) payments
                                              │
                                              └── (many) bill_adjustments

payments ─── (many) statutory_deductions

fund_sources (1) ─── (many) fund_releases
              └── (many) fund_share_heads

cashbook ─── (many) cashbook_closings
```
