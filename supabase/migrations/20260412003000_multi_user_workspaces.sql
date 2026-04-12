create type public.workspace_role as enum (
  'owner',
  'admin',
  'member'
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_sign_in_at timestamptz
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, user_id)
);

create index profiles_email_idx on public.profiles(email);
create index workspaces_created_by_user_id_idx on public.workspaces(created_by_user_id);
create index workspace_memberships_user_id_idx on public.workspace_memberships(user_id);
create index workspace_memberships_workspace_id_idx on public.workspace_memberships(workspace_id);
create index workspace_memberships_role_idx on public.workspace_memberships(role);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row
execute procedure public.set_updated_at();

create trigger workspace_memberships_set_updated_at
before update on public.workspace_memberships
for each row
execute procedure public.set_updated_at();

create or replace function public.ensure_private_workspace_for_user(
  p_user_id uuid,
  p_email text default '',
  p_display_name text default null,
  p_avatar_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_workspace_name text;
  v_workspace_slug text;
begin
  insert into public.profiles (user_id, email, display_name, avatar_url, last_sign_in_at)
  values (
    p_user_id,
    coalesce(p_email, ''),
    p_display_name,
    p_avatar_url,
    timezone('utc', now())
  )
  on conflict (user_id)
  do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    last_sign_in_at = timezone('utc', now()),
    updated_at = timezone('utc', now());

  select wm.workspace_id
    into v_workspace_id
  from public.workspace_memberships wm
  where wm.user_id = p_user_id
    and wm.is_active = true
  order by wm.created_at asc
  limit 1;

  if v_workspace_id is not null then
    return v_workspace_id;
  end if;

  v_workspace_name := coalesce(
    nullif(p_display_name, ''),
    nullif(split_part(p_email, '@', 1), ''),
    'Workspace'
  ) || ' Workspace';

  v_workspace_slug := lower(
    regexp_replace(v_workspace_name, '[^a-zA-Z0-9]+', '-', 'g')
  );
  v_workspace_slug := trim(both '-' from v_workspace_slug) || '-' || left(replace(p_user_id::text, '-', ''), 8);

  insert into public.workspaces (name, slug, created_by_user_id)
  values (v_workspace_name, v_workspace_slug, p_user_id)
  returning id into v_workspace_id;

  insert into public.workspace_memberships (workspace_id, user_id, role, is_active)
  values (v_workspace_id, p_user_id, 'owner', true)
  on conflict (workspace_id, user_id) do nothing;

  return v_workspace_id;
end;
$$;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_private_workspace_for_user(
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_auth_user_created();

insert into public.profiles (user_id, email, display_name, avatar_url, last_sign_in_at)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  ),
  coalesce(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  ),
  u.last_sign_in_at
from auth.users u
on conflict (user_id)
do update set
  email = excluded.email,
  display_name = coalesce(excluded.display_name, public.profiles.display_name),
  avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
  last_sign_in_at = coalesce(excluded.last_sign_in_at, public.profiles.last_sign_in_at),
  updated_at = timezone('utc', now());

alter table public.agents add column workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.agent_api_keys add column workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.todos add column workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.todo_events add column workspace_id uuid references public.workspaces(id) on delete cascade;

do $$
declare
  v_legacy_workspace_id uuid;
begin
  if exists (select 1 from public.admin_users)
    or exists (select 1 from public.agents)
    or exists (select 1 from public.todos) then

    insert into public.workspaces (name, slug, created_by_user_id)
    values (
      'Legacy Workspace',
      'legacy-' || left(replace(gen_random_uuid()::text, '-', ''), 8),
      (select user_id from public.admin_users order by created_at asc limit 1)
    )
    returning id into v_legacy_workspace_id;

    insert into public.workspace_memberships (workspace_id, user_id, role, is_active)
    select
      v_legacy_workspace_id,
      admin_user.user_id,
      case
        when row_number() over (order by admin_user.created_at asc, admin_user.user_id asc) = 1
          then 'owner'::public.workspace_role
        else 'admin'::public.workspace_role
      end,
      admin_user.is_active
    from public.admin_users admin_user
    on conflict (workspace_id, user_id) do nothing;

    update public.agents
      set workspace_id = v_legacy_workspace_id
      where workspace_id is null;

    update public.agent_api_keys api_key
      set workspace_id = agent.workspace_id
      from public.agents agent
      where api_key.agent_id = agent.id
        and api_key.workspace_id is null;

    update public.todos
      set workspace_id = v_legacy_workspace_id
      where workspace_id is null;

    update public.todo_events event_row
      set workspace_id = coalesce(todo.workspace_id, v_legacy_workspace_id)
      from public.todos todo
      where event_row.todo_id = todo.id
        and event_row.workspace_id is null;
  end if;
end;
$$;

alter table public.agents alter column workspace_id set not null;
alter table public.agent_api_keys alter column workspace_id set not null;
alter table public.todos alter column workspace_id set not null;
alter table public.todo_events alter column workspace_id set not null;

drop index if exists public.todos_source_external_id_key;
create unique index todos_workspace_source_external_id_key
  on public.todos(workspace_id, source, external_id)
  where external_id is not null;

create index agents_workspace_id_idx on public.agents(workspace_id);
create index agent_api_keys_workspace_id_idx on public.agent_api_keys(workspace_id);
create index todos_workspace_id_idx on public.todos(workspace_id);
create index todo_events_workspace_id_idx on public.todo_events(workspace_id);

create or replace function public.app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.user_id = auth.uid()
      and wm.is_active = true
      and wm.role in ('owner', 'admin')
  );
$$;

create or replace function public.app_is_workspace_member(
  p_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.is_active = true
  );
$$;

create or replace function public.app_is_workspace_admin(
  p_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.is_active = true
      and wm.role in ('owner', 'admin')
  );
$$;

grant select, update on public.profiles to authenticated;
grant select on public.workspaces to authenticated;
grant select on public.workspace_memberships to authenticated;
grant execute on function public.ensure_private_workspace_for_user(uuid, text, text, text) to authenticated;
grant execute on function public.app_is_workspace_member(uuid) to authenticated;
grant execute on function public.app_is_workspace_admin(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;

create policy "Users can view and update own profile"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Workspace members can view workspaces"
on public.workspaces
for select
to authenticated
using (public.app_is_workspace_member(id));

create policy "Users can view own memberships"
on public.workspace_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.app_is_workspace_admin(workspace_id)
);

drop policy if exists "Authenticated admins manage agents" on public.agents;
create policy "Workspace members can view agents"
on public.agents
for select
to authenticated
using (public.app_is_workspace_member(workspace_id));

create policy "Workspace admins manage agents"
on public.agents
for insert
to authenticated
with check (public.app_is_workspace_admin(workspace_id));

create policy "Workspace admins update agents"
on public.agents
for update
to authenticated
using (public.app_is_workspace_admin(workspace_id))
with check (public.app_is_workspace_admin(workspace_id));

create policy "Workspace admins delete agents"
on public.agents
for delete
to authenticated
using (public.app_is_workspace_admin(workspace_id));

drop policy if exists "Authenticated admins manage agent_api_keys" on public.agent_api_keys;
create policy "Workspace admins manage agent api keys"
on public.agent_api_keys
for all
to authenticated
using (public.app_is_workspace_admin(workspace_id))
with check (public.app_is_workspace_admin(workspace_id));

drop policy if exists "Authenticated admins manage todos" on public.todos;
create policy "Workspace members can view todos"
on public.todos
for select
to authenticated
using (public.app_is_workspace_member(workspace_id));

create policy "Workspace admins insert todos"
on public.todos
for insert
to authenticated
with check (public.app_is_workspace_admin(workspace_id));

create policy "Workspace admins update todos"
on public.todos
for update
to authenticated
using (public.app_is_workspace_admin(workspace_id))
with check (public.app_is_workspace_admin(workspace_id));

create policy "Workspace admins delete todos"
on public.todos
for delete
to authenticated
using (public.app_is_workspace_admin(workspace_id));

drop policy if exists "Authenticated admins read todo_events" on public.todo_events;
drop policy if exists "Authenticated admins insert todo_events" on public.todo_events;
create policy "Workspace members can view todo events"
on public.todo_events
for select
to authenticated
using (public.app_is_workspace_member(workspace_id));

create policy "Workspace admins insert todo events"
on public.todo_events
for insert
to authenticated
with check (public.app_is_workspace_admin(workspace_id));

drop policy if exists "Authenticated admins read api_rate_limit_buckets" on public.api_rate_limit_buckets;
create policy "Workspace admins can view rate limits"
on public.api_rate_limit_buckets
for select
to authenticated
using (
  exists (
    select 1
    from public.agent_api_keys api_key
    where api_key.id = api_rate_limit_buckets.api_key_id
      and public.app_is_workspace_admin(api_key.workspace_id)
  )
);
