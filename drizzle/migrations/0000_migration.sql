create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  college text not null default '',
  branch text not null default '',
  current_semester int not null default 1,
  overall_attendance numeric not null default 0,
  active_backlogs int not null default 0,
  skills text[] not null default '{}',
  placement_goal text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  semester int not null,
  sgpa numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, semester)
);
grant select, insert, update, delete on public.semesters to authenticated;
grant all on public.semesters to service_role;
alter table public.semesters enable row level security;
create policy "own semesters" on public.semesters for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  semester int not null,
  name text not null,
  marks numeric not null,
  attendance numeric not null,
  is_backlog boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.subjects to authenticated;
grant all on public.subjects to service_role;
alter table public.subjects enable row level security;
create policy "own subjects" on public.subjects for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  title text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.activities to authenticated;
grant all on public.activities to service_role;
alter table public.activities enable row level security;
create policy "own activities" on public.activities for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();