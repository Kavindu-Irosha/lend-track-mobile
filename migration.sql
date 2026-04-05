-- Update Customers Table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nic_number TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_phone TEXT;

-- Update Loans Table
ALTER TABLE loans ADD COLUMN IF NOT EXISTS interest_type TEXT DEFAULT 'flat'; -- 'flat' or 'percent'
ALTER TABLE loans ADD COLUMN IF NOT EXISTS interest_rate DECIMAL DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS penalty_fee DECIMAL DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS purpose TEXT;

-- Update Payments Table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash'; -- 'cash', 'bank_transfer', 'ez_cash', 'other'
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Professional Lending Upgrades
ALTER TABLE loans ADD COLUMN IF NOT EXISTS penalty_enabled BOOLEAN DEFAULT false;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS penalty_type TEXT DEFAULT 'fixed'; -- 'fixed' or 'daily'
ALTER TABLE loans ADD COLUMN IF NOT EXISTS penalty_value DECIMAL DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS collateral_details TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS interest_model TEXT DEFAULT 'flat'; -- 'flat' or 'reducing'
