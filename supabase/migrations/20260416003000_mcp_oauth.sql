create table public.oauth_authorization_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null,
  redirect_uri text not null,
  scope text[] not null default '{}',
  resource text not null,
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.oauth_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  refresh_token_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null,
  scope text[] not null default '{}',
  resource text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  last_used_at timestamptz
);

create table public.oauth_access_tokens (
  id uuid primary key default gen_random_uuid(),
  access_token_hash text not null unique,
  refresh_token_id uuid references public.oauth_refresh_tokens(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null,
  scope text[] not null default '{}',
  resource text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  last_used_at timestamptz
);

create index oauth_authorization_codes_user_id_idx
  on public.oauth_authorization_codes(user_id);
create index oauth_authorization_codes_workspace_id_idx
  on public.oauth_authorization_codes(workspace_id);
create index oauth_authorization_codes_expires_at_idx
  on public.oauth_authorization_codes(expires_at);

create index oauth_refresh_tokens_user_id_idx
  on public.oauth_refresh_tokens(user_id);
create index oauth_refresh_tokens_workspace_id_idx
  on public.oauth_refresh_tokens(workspace_id);
create index oauth_refresh_tokens_expires_at_idx
  on public.oauth_refresh_tokens(expires_at);

create index oauth_access_tokens_user_id_idx
  on public.oauth_access_tokens(user_id);
create index oauth_access_tokens_workspace_id_idx
  on public.oauth_access_tokens(workspace_id);
create index oauth_access_tokens_expires_at_idx
  on public.oauth_access_tokens(expires_at);
