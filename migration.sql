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

-- Fix Database Error Deleting User (Enable cascading deletes from auth.users)
-- This allows deleting users from the Supabase Auth dashboard without referential integrity errors.

-- For Customers Table
ALTER TABLE public.customers 
DROP CONSTRAINT IF EXISTS customers_user_id_fkey,
ADD CONSTRAINT customers_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- For Loans Table
ALTER TABLE public.loans 
DROP CONSTRAINT IF EXISTS loans_user_id_fkey,
ADD CONSTRAINT loans_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- For Payments Table
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_user_id_fkey,
ADD CONSTRAINT payments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
