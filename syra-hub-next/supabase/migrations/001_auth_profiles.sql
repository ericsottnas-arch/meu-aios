-- ============================================================
-- Syra Hub — Auth & Profiles Schema
-- ============================================================

-- Clients (created FIRST because profiles references it)
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  type text,
  category text,
  status text not null default 'active' check (status in ('active', 'onboarding', 'prospect', 'inactive')),
  priority text not null default 'standard' check (priority in ('premium', 'growth', 'standard')),
  location text,
  specialty text,
  contact jsonb default '{}',
  brand jsonb default '{}',
  celo_config jsonb default '{}',
  integrations jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'client' check (role in ('admin', 'client')),
  client_id uuid references public.clients(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated at trigger
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: get client_id for current user
create or replace function public.user_client_id()
returns uuid
language sql
security definer
stable
as $$
  select client_id from public.profiles
  where id = auth.uid();
$$;

-- Profiles: users can read own profile, admins can read all
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (is_admin());

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (is_admin());

-- Clients: admins see all, clients see only their own
create policy "Admins can view all clients"
  on public.clients for select
  using (is_admin());

create policy "Clients can view own client"
  on public.clients for select
  using (id = user_client_id());

create policy "Admins can insert clients"
  on public.clients for insert
  with check (is_admin());

create policy "Admins can update clients"
  on public.clients for update
  using (is_admin());

-- ============================================================
-- Indexes
-- ============================================================

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_client_id on public.profiles(client_id);
create index idx_clients_slug on public.clients(slug);
create index idx_clients_status on public.clients(status);
