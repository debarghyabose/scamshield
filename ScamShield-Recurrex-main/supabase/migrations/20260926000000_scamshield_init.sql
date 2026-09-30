-- =====================================================================
-- ScamShield — initial schema
--
-- Tables:   public.profiles, public.scans, public.reports
-- Security: Row Level Security on every table. A signed-in user can only
--           read/write rows whose user_id equals auth.uid(). The anon role
--           has no access at all.
-- Storage:  "avatars" bucket; users may only write inside a folder named
--           after their own user id (avatars/<uid>/...).
--
-- Run this once in the Supabase SQL editor (or `supabase db push`).
-- It is idempotent where practical, so re-running it is safe.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on sign-up
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references auth.users (id) on delete cascade,
  full_name             text check (char_length(full_name) <= 120),
  email                 text,
  avatar_url            text check (char_length(avatar_url) <= 1024),
  theme                 text not null default 'system' check (theme in ('light', 'dark', 'system')),
  notifications_enabled boolean not null default true,
  language              text not null default 'en' check (language in ('en', 'hi', 'bn')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- scans: private scan history
-- ---------------------------------------------------------------------
create table if not exists public.scans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  scan_type       text not null check (scan_type in ('message', 'url', 'payment')),
  input_text      text not null check (char_length(input_text) <= 4000),
  risk_level      text not null check (risk_level in ('SAFE', 'SUSPICIOUS', 'DANGEROUS')),
  risk_score      smallint not null check (risk_score between 0 and 100),
  reasons         jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  summary         text,
  category        text,
  details         jsonb not null default '{}'::jsonb,  -- indicators, checks, request payload
  engine          text,
  created_at      timestamptz not null default now()
);

create index if not exists scans_user_created_idx on public.scans (user_id, created_at desc);


-- ---------------------------------------------------------------------
-- reports: scam reports submitted by a user (private to that user)
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  scam_type    text not null check (char_length(scam_type) between 2 and 60),
  content      text not null check (char_length(content) between 10 and 2000),
  phone_number text check (char_length(phone_number) <= 32),
  url          text check (char_length(url) <= 2048),
  description  text check (char_length(description) <= 1000),
  created_at   timestamptz not null default now()
);

create index if not exists reports_user_created_idx on public.reports (user_id, created_at desc);


-- ---------------------------------------------------------------------
-- Create a profile automatically when a user signs up
-- (email/password sign-up passes full_name in user metadata; Google
--  provides full_name/name and avatar_url/picture)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 120),
    left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'), 1024)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync if the user changes their email address.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();


-- ---------------------------------------------------------------------
-- Privileges: anon gets nothing; authenticated gets only what RLS allows.
-- The FastAPI backend uses the service_role key, which bypasses RLS, so
-- the backend always filters by the user id taken from the verified token.
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.scans, public.reports from anon;
revoke all on public.profiles, public.scans, public.reports from authenticated;

grant select on public.profiles to authenticated;
-- Users may change only these columns of their own profile (not user_id/email).
grant update (full_name, avatar_url, theme, notifications_enabled, language) on public.profiles to authenticated;

grant select, insert, delete on public.scans to authenticated;
grant select, insert on public.reports to authenticated;

grant all on public.profiles, public.scans, public.reports to service_role;


-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.scans    enable row level security;
alter table public.reports  enable row level security;

-- profiles
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- scans
drop policy if exists "Users can view their own scans" on public.scans;
create policy "Users can view their own scans"
  on public.scans for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own scans" on public.scans;
create policy "Users can insert their own scans"
  on public.scans for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own scans" on public.scans;
create policy "Users can delete their own scans"
  on public.scans for delete to authenticated
  using ((select auth.uid()) = user_id);

-- reports
drop policy if exists "Users can view their own reports" on public.reports;
create policy "Users can view their own reports"
  on public.reports for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own reports" on public.reports;
create policy "Users can insert their own reports"
  on public.reports for insert to authenticated
  with check ((select auth.uid()) = user_id);


-- ---------------------------------------------------------------------
-- Storage: avatars bucket (public read via URL, owner-only write)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their own avatar objects" on storage.objects;
create policy "Users can view their own avatar objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
