-- ============================================================
-- Client Integrations — tokens e IDs por plataforma
-- Acessível apenas via service role (admins só via API server-side)
-- ============================================================

create table public.client_integrations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  platform text not null check (platform in ('ghl', 'meta', 'google_ads')),
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, platform)
);

create trigger client_integrations_updated_at
  before update on public.client_integrations
  for each row execute function public.handle_updated_at();

-- RLS: apenas admins podem ver (tokens ficam server-side via service role)
alter table public.client_integrations enable row level security;

create policy "Admins can manage client integrations"
  on public.client_integrations
  using (is_admin());
