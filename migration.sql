-- Update Customers Table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nic_number TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_card_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_card_back_url TEXT;

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

-- ============================================================================
-- ENTERPRISE SECURITY: ROW LEVEL SECURITY & AUDIT LOGGING
-- ============================================================================

-- 1. Security Events / Audit Ledger
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    description TEXT,
    ip_address TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS) on all multi-tenant tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 3. Enforce Strict Tenant Isolation (auth.uid() = user_id)
-- Customers Policies
DROP POLICY IF EXISTS "Users can only access their own customers" ON public.customers;
CREATE POLICY "Users can only access their own customers" ON public.customers
    FOR ALL USING (auth.uid() = user_id);

-- Loans Policies
DROP POLICY IF EXISTS "Users can only access their own loans" ON public.loans;
CREATE POLICY "Users can only access their own loans" ON public.loans
    FOR ALL USING (auth.uid() = user_id);

-- Payments Policies
DROP POLICY IF EXISTS "Users can only access their own payments" ON public.payments;
CREATE POLICY "Users can only access their own payments" ON public.payments
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- STORAGE SECURITY: BUCKET RLS FOR ID CARDS
-- ============================================================================

-- Ensure the bucket exists (this requires Superuser/Dashboard SQL, but good practice to document)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('customer_ids', 'customer_ids', false) 
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow users to insert files if the path starts with their user_id
DROP POLICY IF EXISTS "Users can upload their own customer IDs" ON storage.objects;
CREATE POLICY "Users can upload their own customer IDs" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'customer_ids' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow users to select (read) their own files
DROP POLICY IF EXISTS "Users can read their own customer IDs" ON storage.objects;
CREATE POLICY "Users can read their own customer IDs" ON storage.objects
    FOR SELECT USING (bucket_id = 'customer_ids' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow users to delete their own files
DROP POLICY IF EXISTS "Users can delete their own customer IDs" ON storage.objects;
CREATE POLICY "Users can delete their own customer IDs" ON storage.objects
    FOR DELETE USING (bucket_id = 'customer_ids' AND auth.uid()::text = (storage.foldername(name))[1]);
