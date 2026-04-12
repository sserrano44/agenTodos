create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.todo_status as enum (
  'todo',
  'in_progress',
  'done',
  'blocked',
  'archived'
);

create type public.todo_priority as enum (
  'low',
  'medium',
  'high',
  'urgent'
);

create type public.todo_source as enum (
  'claude_cowork',
  'openclaw',
  'manual',
  'api',
  'mcp'
);

create type public.agent_source_type as enum (
  'claude_cowork',
  'openclaw',
  'custom'
);

create type public.api_key_scope as enum (
  'todos:read',
  'todos:write',
  'mcp:use'
);

create type public.todo_event_actor_type as enum (
  'admin',
  'agent',
  'system'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type public.agent_source_type not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_used_at timestamptz
);

create table public.agent_api_keys (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  label text not null,
  key_prefix text not null,
  key_last4 text not null,
  key_hash text not null unique,
  scopes public.api_key_scope[] not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_used_at timestamptz,
  revoked_at timestamptz,
  constraint agent_api_keys_scopes_nonempty check (cardinality(scopes) > 0)
);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.todo_status not null default 'todo',
  priority public.todo_priority not null default 'medium',
  source public.todo_source not null default 'manual',
  external_id text,
  agent_id uuid references public.agents(id) on delete set null,
  due_at timestamptz,
  scheduled_for timestamptz,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table public.todo_events (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null,
  actor_type public.todo_event_actor_type not null,
  actor_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.api_rate_limit_buckets (
  api_key_id uuid not null references public.agent_api_keys(id) on delete cascade,
  bucket_start timestamptz not null,
  request_count integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (api_key_id, bucket_start),
  constraint api_rate_limit_buckets_positive_count check (request_count > 0)
);

create unique index todos_source_external_id_key
  on public.todos(source, external_id)
  where external_id is not null;

create index todos_status_idx on public.todos(status);
create index todos_priority_idx on public.todos(priority);
create index todos_source_idx on public.todos(source);
create index todos_due_at_idx on public.todos(due_at);
create index todos_created_at_idx on public.todos(created_at desc);
create index todos_agent_id_idx on public.todos(agent_id);
create index todos_search_idx
  on public.todos
  using gin ((coalesce(title, '') || ' ' || coalesce(description, '')) gin_trgm_ops);

create index agents_source_type_idx on public.agents(source_type);
create index agents_last_used_at_idx on public.agents(last_used_at);
create index agent_api_keys_agent_id_idx on public.agent_api_keys(agent_id);
create index agent_api_keys_last_used_at_idx on public.agent_api_keys(last_used_at);
create index todo_events_todo_id_idx on public.todo_events(todo_id);
create index api_rate_limit_buckets_updated_at_idx on public.api_rate_limit_buckets(updated_at);

create trigger admin_users_set_updated_at
before update on public.admin_users
for each row
execute procedure public.set_updated_at();

create trigger agents_set_updated_at
before update on public.agents
for each row
execute procedure public.set_updated_at();

create trigger agent_api_keys_set_updated_at
before update on public.agent_api_keys
for each row
execute procedure public.set_updated_at();

create trigger todos_set_updated_at
before update on public.todos
for each row
execute procedure public.set_updated_at();

create trigger api_rate_limit_buckets_set_updated_at
before update on public.api_rate_limit_buckets
for each row
execute procedure public.set_updated_at();

create or replace function public.app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.consume_api_rate_limit(
  p_api_key_id uuid,
  p_limit integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket timestamptz := date_trunc('minute', timezone('utc', now()));
  v_count integer;
begin
  insert into public.api_rate_limit_buckets (api_key_id, bucket_start, request_count)
  values (p_api_key_id, v_bucket, 1)
  on conflict (api_key_id, bucket_start)
  do update
    set request_count = public.api_rate_limit_buckets.request_count + 1,
        updated_at = timezone('utc', now())
  returning request_count into v_count;

  return v_count <= greatest(p_limit, 1);
end;
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.admin_users to authenticated;
grant select, insert, update, delete on public.agents to authenticated;
grant select, insert, update, delete on public.agent_api_keys to authenticated;
grant select, insert, update, delete on public.todos to authenticated;
grant select, insert on public.todo_events to authenticated;
grant select on public.api_rate_limit_buckets to authenticated;
grant execute on function public.app_is_admin() to authenticated;
grant execute on function public.consume_api_rate_limit(uuid, integer) to authenticated;

alter table public.admin_users enable row level security;
alter table public.agents enable row level security;
alter table public.agent_api_keys enable row level security;
alter table public.todos enable row level security;
alter table public.todo_events enable row level security;
alter table public.api_rate_limit_buckets enable row level security;

create policy "Admin users can read own row"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

create policy "Authenticated admins manage agents"
on public.agents
for all
to authenticated
using (public.app_is_admin())
with check (public.app_is_admin());

create policy "Authenticated admins manage agent_api_keys"
on public.agent_api_keys
for all
to authenticated
using (public.app_is_admin())
with check (public.app_is_admin());

create policy "Authenticated admins manage todos"
on public.todos
for all
to authenticated
using (public.app_is_admin())
with check (public.app_is_admin());

create policy "Authenticated admins read todo_events"
on public.todo_events
for select
to authenticated
using (public.app_is_admin());

create policy "Authenticated admins insert todo_events"
on public.todo_events
for insert
to authenticated
with check (public.app_is_admin());

create policy "Authenticated admins read api_rate_limit_buckets"
on public.api_rate_limit_buckets
for select
to authenticated
using (public.app_is_admin());
