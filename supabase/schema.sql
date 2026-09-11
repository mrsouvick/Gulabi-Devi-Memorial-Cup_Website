-- Run this in the Supabase SQL editor before production deployment.
create table if not exists public.tournament_content (
  id text primary key default 'main' check (id = 'main'),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.tournament_content enable row level security;

-- Add the id of each permitted Supabase Auth user to this table. Content
-- writes are denied to every other signed-in user.
create table if not exists public.tournament_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.tournament_admins enable row level security;

create or replace function public.is_tournament_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tournament_admins where user_id = auth.uid()
  );
$$;

-- The public site can read the published tournament data.
create policy "public can read tournament content"
on public.tournament_content for select using (true);

-- Only authenticated Supabase users can alter content.
create policy "tournament admins can create tournament content"
on public.tournament_content for insert to authenticated with check (public.is_tournament_admin());

create policy "tournament admins can update tournament content"
on public.tournament_content for update to authenticated using (public.is_tournament_admin()) with check (public.is_tournament_admin());

insert into public.tournament_content (id, content)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

-- Public submission procedures for registrations & contact messages
create or replace function public.submit_tournament_registration(p_reg jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tournament_content
  set content = jsonb_set(
    content,
    '{registrations}',
    coalesce(content->'registrations', '[]'::jsonb) || jsonb_build_array(p_reg),
    true
  ),
  updated_at = timezone('utc', now())
  where id = 'main';
end;
$$;

grant execute on function public.submit_tournament_registration(jsonb) to anon, authenticated;

create or replace function public.submit_tournament_message(p_msg jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tournament_content
  set content = jsonb_set(
    content,
    '{messages}',
    coalesce(content->'messages', '[]'::jsonb) || jsonb_build_array(p_msg),
    true
  ),
  updated_at = timezone('utc', now())
  where id = 'main';
end;
$$;

grant execute on function public.submit_tournament_message(jsonb) to anon, authenticated;

-- After creating the intended administrator in Supabase Authentication, run:
-- insert into public.tournament_admins (user_id) values ('AUTH-USER-UUID-HERE');
