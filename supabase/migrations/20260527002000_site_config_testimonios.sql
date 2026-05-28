create table if not exists public.site_config (
  id text primary key default 'main',
  actores_count integer not null default 0,
  productos_count integer not null default 0,
  acuerdos_count integer not null default 0,
  ventas_impacto numeric not null default 0,
  telefono text not null default '+51 076 365 000',
  email text not null default 'info@articulacaj.pe',
  direccion text not null default 'Cajamarca, Peru',
  updated_at timestamptz not null default now()
);

insert into public.site_config (id)
values ('main')
on conflict (id) do nothing;

create table if not exists public.testimonios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cargo text not null,
  organizacion text,
  foto text,
  texto text not null,
  rating integer not null default 5 check (rating between 1 and 5),
  activo boolean not null default true,
  orden integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_config enable row level security;
alter table public.testimonios enable row level security;

drop policy if exists "site_config public read" on public.site_config;
create policy "site_config public read"
  on public.site_config for select
  using (true);

drop policy if exists "testimonios public read active" on public.testimonios;
create policy "testimonios public read active"
  on public.testimonios for select
  using (activo = true or exists (
    select 1 from public.perfiles p
    where p.auth_user_id = auth.uid()
      and p.rol = 'admin'
  ));

drop policy if exists "site_config admin write" on public.site_config;
create policy "site_config admin write"
  on public.site_config for all
  using (exists (
    select 1 from public.perfiles p
    where p.auth_user_id = auth.uid()
      and p.rol = 'admin'
  ))
  with check (exists (
    select 1 from public.perfiles p
    where p.auth_user_id = auth.uid()
      and p.rol = 'admin'
  ));

drop policy if exists "testimonios admin write" on public.testimonios;
create policy "testimonios admin write"
  on public.testimonios for all
  using (exists (
    select 1 from public.perfiles p
    where p.auth_user_id = auth.uid()
      and p.rol = 'admin'
  ))
  with check (exists (
    select 1 from public.perfiles p
    where p.auth_user_id = auth.uid()
      and p.rol = 'admin'
  ));
