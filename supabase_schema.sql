-- ==========================================
-- SUPABASE SCHEMA FOR MANUSCRIPT FORMATTER
-- ==========================================

-- 1. Create custom users table for our existing Auth flow
-- (We use this to store the TOTP secrets and passwords)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    totp_secret TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service Role Full Access Users" ON public.users FOR ALL USING (true);


-- 2. Create documents table for formatting history
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    publication_venue TEXT NOT NULL,
    document_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    docx_url TEXT,
    html_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service Role Full Access Documents" ON public.documents FOR ALL USING (true);

-- ==========================================
-- SUPABASE STORAGE BUCKETS
-- ==========================================
-- Run these via Supabase Dashboard SQL Editor or via API

-- Create bucket for formatted outputs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('outputs', 'outputs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up basic bucket policies for 'outputs'
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'outputs' );

CREATE POLICY "Service Role Full Access Storage" 
ON storage.objects FOR ALL 
USING ( bucket_id = 'outputs' );
