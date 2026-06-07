-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'finance_officer', 'accountant', 'engineer')),
  office_id VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_office_id ON users(office_id);
CREATE INDEX idx_users_email ON users(email);

-- Schemes Table
CREATE TABLE IF NOT EXISTS schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheme_code VARCHAR(100),
  scheme_name VARCHAR(255) NOT NULL,
  description TEXT,
  loan_no VARCHAR(100),
  office_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_schemes_code ON schemes(scheme_code) WHERE scheme_code IS NOT NULL;
CREATE INDEX idx_schemes_office_id ON schemes(office_id);

-- Components Table
CREATE TABLE IF NOT EXISTS components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  component_name VARCHAR(255) NOT NULL,
  description TEXT,
  budget_amount DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_components_scheme_id ON components(scheme_id);

-- Sub Components Table
CREATE TABLE IF NOT EXISTS sub_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  sub_component_name VARCHAR(255) NOT NULL,
  description TEXT,
  budget_amount DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sub_components_component_id ON sub_components(component_id);

-- Contractors Table
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  pan_no VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contracts Table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_no VARCHAR(100) NOT NULL UNIQUE,
  scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id),
  sub_component_id UUID REFERENCES sub_components(id),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  contract_value DECIMAL(15,2) NOT NULL,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contracts_scheme_id ON contracts(scheme_id);
CREATE INDEX idx_contracts_contractor_id ON contracts(contractor_id);
CREATE UNIQUE INDEX idx_contracts_no ON contracts(contract_no);

-- Fund Sources Table
CREATE TABLE IF NOT EXISTS fund_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id VARCHAR(255) NOT NULL,
  source_name VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('SASCI', 'STATE_BUDGET', 'OTHER')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fund_sources_office_id ON fund_sources(office_id);

-- Fund Share Heads Table
CREATE TABLE IF NOT EXISTS fund_share_heads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id VARCHAR(255) NOT NULL,
  head_name VARCHAR(255) NOT NULL,
  fund_source_id UUID REFERENCES fund_sources(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fund_share_heads_office_id ON fund_share_heads(office_id);
CREATE INDEX idx_fund_share_heads_source_id ON fund_share_heads(fund_source_id);

-- Fund Releases Table
CREATE TABLE IF NOT EXISTS fund_releases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  release_date DATE NOT NULL,
  release_amount DECIMAL(15,2) NOT NULL,
  fund_source_id UUID NOT NULL REFERENCES fund_sources(id),
  release_no VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fund_releases_scheme_id ON fund_releases(scheme_id);
CREATE INDEX idx_fund_releases_fund_source_id ON fund_releases(fund_source_id);

-- Fund Share Breakdown Table
CREATE TABLE IF NOT EXISTS fund_share_breakdown (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fund_release_id UUID NOT NULL REFERENCES fund_releases(id) ON DELETE CASCADE,
  fund_share_head_id UUID NOT NULL REFERENCES fund_share_heads(id),
  share_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fund_share_breakdown_release_id ON fund_share_breakdown(fund_release_id);
CREATE INDEX idx_fund_share_breakdown_head_id ON fund_share_breakdown(fund_share_head_id);

-- Fund Transfers Table
CREATE TABLE IF NOT EXISTS fund_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  transfer_date DATE NOT NULL,
  from_account VARCHAR(255),
  to_account VARCHAR(255),
  transfer_amount DECIMAL(15,2) NOT NULL,
  fund_release_id UUID REFERENCES fund_releases(id),
  transfer_mode VARCHAR(50) CHECK (transfer_mode IN ('FULL', 'INSTALLMENT')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fund_transfers_scheme_id ON fund_transfers(scheme_id);
CREATE INDEX idx_fund_transfers_release_id ON fund_transfers(fund_release_id);

-- Contractor Bills Table
CREATE TABLE IF NOT EXISTS contractor_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  bill_date DATE NOT NULL,
  bill_number VARCHAR(100) NOT NULL UNIQUE,
  work_done_value DECIMAL(15,2) NOT NULL,
  cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_amount DECIMAL(15,2) DEFAULT 0,
  labour_cess_amount DECIMAL(15,2) DEFAULT 0,
  gross_bill_amount DECIMAL(15,2),
  adhoc_withheld DECIMAL(15,2) DEFAULT 0,
  csc_temporary_withheld DECIMAL(15,2) DEFAULT 0,
  net_liability DECIMAL(15,2),
  bill_status VARCHAR(50) DEFAULT 'pending' CHECK (bill_status IN ('pending', 'submitted', 'under_review', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bills_contract_id ON contractor_bills(contract_id);
CREATE INDEX idx_bills_bill_number ON contractor_bills(bill_number);

-- Bill Adjustments Table
CREATE TABLE IF NOT EXISTS bill_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_bill_id UUID NOT NULL REFERENCES contractor_bills(id) ON DELETE CASCADE,
  adjustment_type VARCHAR(50) CHECK (adjustment_type IN ('ADHOC_WITHHELD', 'CSC_TEMPORARY_WITHHELD')),
  adjustment_amount DECIMAL(15,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bill_adjustments_bill_id ON bill_adjustments(contractor_bill_id);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_bill_id UUID NOT NULL REFERENCES contractor_bills(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(15,2) NOT NULL,
  payment_reference_no VARCHAR(100),
  payment_mode VARCHAR(50) CHECK (payment_mode IN ('CHEQUE', 'NEFT', 'RTGS', 'CASH')),
  fund_source_id UUID REFERENCES fund_sources(id),
  fund_share_head_id UUID REFERENCES fund_share_heads(id),
  is_installment BOOLEAN DEFAULT false,
  installment_no INTEGER,
  total_installments INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_bill_id ON payments(contractor_bill_id);
CREATE INDEX idx_payments_fund_source_id ON payments(fund_source_id);

-- Statutory Deductions Table
CREATE TABLE IF NOT EXISTS statutory_deductions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  deduction_type VARCHAR(50) CHECK (deduction_type IN ('CGST_TDS', 'SGST_TDS', 'IGST_TDS', 'RETENTION_MONEY', 'OTHER')),
  deduction_amount DECIMAL(15,2) NOT NULL,
  deduction_rate DECIMAL(5,2),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deductions_payment_id ON statutory_deductions(payment_id);

-- Cashbook Table
CREATE TABLE IF NOT EXISTS cashbook (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id VARCHAR(255) NOT NULL,
  entry_date DATE NOT NULL,
  entry_type VARCHAR(50) CHECK (entry_type IN ('RECEIPT', 'PAYMENT', 'TRANSFER')),
  description VARCHAR(255) NOT NULL,
  reference_id UUID,
  reference_type VARCHAR(50),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  balance DECIMAL(15,2),
  scheme_id UUID REFERENCES schemes(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cashbook_office_id ON cashbook(office_id);
CREATE INDEX idx_cashbook_entry_date ON cashbook(entry_date);
CREATE INDEX idx_cashbook_scheme_id ON cashbook(scheme_id);

-- Cashbook Closings Table
CREATE TABLE IF NOT EXISTS cashbook_closings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id VARCHAR(255) NOT NULL,
  closing_month DATE NOT NULL,
  opening_balance DECIMAL(15,2),
  closing_balance DECIMAL(15,2) NOT NULL,
  total_receipts DECIMAL(15,2) DEFAULT 0,
  total_payments DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_closings_office_id ON cashbook_closings(office_id);
CREATE INDEX idx_closings_month ON cashbook_closings(closing_month);
