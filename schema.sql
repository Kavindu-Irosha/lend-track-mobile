-- LENDTRACK SUPABASE SCHEMA DEFINITION
-- VERSION 2.5.0

-- 1. CUSTOMERS TABLE
CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    nic_number text,
    emergency_phone text,
    address text,
    avatar_url text,
    id_card_url text,
    id_card_back_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. LOANS TABLE
CREATE TABLE public.loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    interest numeric DEFAULT 0,
    interest_rate numeric DEFAULT 0,
    interest_type text DEFAULT 'percent'::text, -- 'percent' or 'flat'
    interest_model text DEFAULT 'flat'::text, -- 'flat', 'reducing', 'interest_only'
    installment_type text DEFAULT 'monthly'::text, -- 'daily', 'weekly', 'monthly'
    start_date date DEFAULT CURRENT_DATE,
    due_date date,
    status text DEFAULT 'Active'::text,
    collateral_details text,
    purpose text,
    penalty_enabled boolean DEFAULT false,
    penalty_type text DEFAULT 'fixed'::text, -- 'fixed' or 'daily'
    penalty_value numeric DEFAULT 0,
    penalty_fee numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. PAYMENTS TABLE
CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    payment_date date DEFAULT CURRENT_DATE,
    payment_method text DEFAULT 'cash'::text,
    reference_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- ENABLE RLS (ROW LEVEL SECURITY)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- CREATE POLICIES (Users can only see their own data)
CREATE POLICY "Users can manage their own customers" ON public.customers
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own loans" ON public.loans
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own payments" ON public.payments
    FOR ALL USING (auth.uid() = user_id);

-- 4. SECURITY EVENTS / AUDIT LOG
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    description TEXT,
    ip_address TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own security events" ON public.security_events
    FOR SELECT USING (auth.uid() = user_id);

-- 5. STORAGE CONFIGURATION (For Customer ID Cards)
-- Note: These commands must be run in the Supabase SQL Editor
-- Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('customer_ids', 'customer_ids', false) 
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Users can upload their own customer IDs" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'customer_ids' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own customer IDs" ON storage.objects
    FOR SELECT USING (bucket_id = 'customer_ids' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own customer IDs" ON storage.objects
    FOR DELETE USING (bucket_id = 'customer_ids' AND auth.uid()::text = (storage.foldername(name))[1]);
