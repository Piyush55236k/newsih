-- Storage bucket for evidence
-- In Supabase Storage, create bucket named 'evidence' and make it public (or set signed URLs and adjust backend accordingly).

-- Quest evidence table
create table if not exists public.quest_evidence (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null,
  quest_id text not null,
  image_url text,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- Optional indexes
create index if not exists idx_quest_evidence_profile on public.quest_evidence(profile_id);
create index if not exists idx_quest_evidence_status on public.quest_evidence(status);

-- Enforce at-most-one active (pending/approved) submission per (profile_id, quest_id)
create unique index if not exists uniq_active_evidence
  on public.quest_evidence(profile_id, quest_id)
  where status in ('pending','approved');

-- RLS policies (simple): allow insert/select by anyone; only service role (server) can update status
alter table public.quest_evidence enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'quest_evidence' and policyname = 'allow_insert_select') then
    create policy allow_insert_select on public.quest_evidence for
      select using (true);
    create policy allow_insert on public.quest_evidence for
      insert with check (true);
  end if;
end $$;

-- No update/delete policy; only the server with service key performs updates

-- Profiles table must exist as earlier with columns: id text primary key, points int, quests_completed text[] or jsonb.
-- If you used jsonb for quests_completed, keep the backend reading/writing jsonb.
