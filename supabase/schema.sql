-- Supabase schema for this app
-- Run in Supabase SQL Editor (connected to your project)

-- Ensure extension for UUIDs
create extension if not exists pgcrypto;

-- =====================
-- Tables
-- =====================

-- Market prices
create table if not exists public.prices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null,
  commodity text not null,
  market text not null,
  price numeric(12,2) not null,
  user_id uuid
);

-- Feedback
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rating int not null check (rating between 1 and 5),
  comment text,
  user_id uuid
);

-- Community posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author text,
  content text not null check (char_length(content) <= 1000),
  user_id uuid
);

-- =====================
-- Indexes
-- =====================
create index if not exists prices_commodity_date_idx on public.prices (commodity, date desc);
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- =====================
-- Row Level Security (RLS) & Policies
-- Note: For quick start we allow public read+insert. Tighten later.
-- =====================

alter table public.prices enable row level security;
alter table public.feedback enable row level security;
alter table public.posts enable row level security;

-- Prices policies (idempotent): drop then create
drop policy if exists "Public read prices" on public.prices;
create policy "Public read prices"
  on public.prices for select to public using (true);
drop policy if exists "Public insert prices" on public.prices;
create policy "Public insert prices"
  on public.prices for insert to public with check (true);

-- Feedback policies
drop policy if exists "Public read feedback" on public.feedback;
create policy "Public read feedback"
  on public.feedback for select to public using (true);
drop policy if exists "Public insert feedback" on public.feedback;
create policy "Public insert feedback"
  on public.feedback for insert to public with check (true);

-- Posts policies
drop policy if exists "Public read posts" on public.posts;
create policy "Public read posts"
  on public.posts for select to public using (true);
drop policy if exists "Public insert posts" on public.posts;
create policy "Public insert posts"
  on public.posts for insert to public with check (true);

-- =====================
-- Realtime
-- =====================
-- Guarded to avoid duplicate_object errors if already added
do $$ begin
  alter publication supabase_realtime add table public.prices;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null; end $$;
-- feedback realtime not necessary for UI, add if you want:
-- alter publication supabase_realtime add table public.feedback;

-- =====================
-- Storage: Bucket + Policies
-- =====================
-- Create a public bucket for uploads (images, etc.)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- RLS on storage.objects is managed by Supabase and is enabled by default

-- Allow public read from the uploads bucket
drop policy if exists "Public read uploads" on storage.objects;
create policy "Public read uploads"
  on storage.objects for select to public
  using (bucket_id = 'uploads');

-- Allow public insert into the uploads bucket
drop policy if exists "Public upload to uploads" on storage.objects;
create policy "Public upload to uploads"
  on storage.objects for insert to public
  with check (bucket_id = 'uploads');

-- Optional: Restrict deletes/updates (omit to keep default deny)
-- create policy if not exists "Owner delete uploads"
--   on storage.objects for delete using (bucket_id = 'uploads' and auth.uid() = owner);
-- create policy if not exists "Owner update uploads"
--   on storage.objects for update using (bucket_id = 'uploads' and auth.uid() = owner);

-- =====================
-- Seed (optional)
-- =====================
-- insert into public.prices (date, commodity, market, price) values
--   (current_date, 'Wheat', 'Local', 2100),
--   (current_date, 'Rice', 'Local', 2400);
