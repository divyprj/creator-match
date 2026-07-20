create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table public.saved_creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  name text not null,
  handle text not null,
  platform text not null check (platform in ('instagram','youtube')),
  profile_url text not null,
  followers integer check (followers is null or followers between 0 and 1000000000),
  engagement_rate numeric(8,3),
  engagement_formula text,
  engagement_sample_size integer not null default 0,
  niche text not null check (niche in ('fashion','beauty','fitness','food','finance','parenting','tech','gaming','education')),
  content_themes text[] not null default '{}',
  contact_email text,
  city text,
  country text not null default 'Unverified',
  strict_eligible boolean not null default false,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_key)
);

create table public.discovery_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  niche text not null, platforms text[] not null, min_followers integer not null, max_followers integer not null,
  result_count integer not null default 0, searched_at timestamptz not null default now()
);

create table public.outreach_drafts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid references public.saved_creators(id) on delete set null, channel text not null check (channel in ('email','instagram_dm')),
  subject text, body text not null, model text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.outreach_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null, channel text not null check (channel in ('email','instagram_dm')),
  recipient text, subject text, body text not null, status text not null check (status in ('draft','sending','sent','failed','opened_manually')),
  provider_message_id text, created_at timestamptz not null default now(), unique (user_id, idempotency_key)
);

create table public.suppression_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  address text not null, reason text, created_at timestamptz not null default now(), unique (user_id, address)
);

alter table public.profiles enable row level security;
alter table public.saved_creators enable row level security;
alter table public.discovery_runs enable row level security;
alter table public.outreach_drafts enable row level security;
alter table public.outreach_events enable row level security;
alter table public.suppression_entries enable row level security;

create policy "profiles_owner" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "saved_creators_owner" on public.saved_creators for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "discovery_runs_owner" on public.discovery_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "outreach_drafts_owner" on public.outreach_drafts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "outreach_events_owner" on public.outreach_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "suppression_entries_owner" on public.suppression_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, email) values (new.id, new.email); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger saved_creators_updated before update on public.saved_creators for each row execute procedure public.set_updated_at();
create trigger outreach_drafts_updated before update on public.outreach_drafts for each row execute procedure public.set_updated_at();
