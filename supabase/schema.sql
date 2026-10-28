-- 만다라트 노트 · Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여 넣고 실행하세요.

create table if not exists public.boards (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  cells       jsonb not null,                 -- string[9][9]
  done        text  not null default repeat('0', 81), -- 81자, '0'/'1'
  note        text  not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint boards_done_len check (char_length(done) = 81),
  constraint boards_note_len check (char_length(note) <= 120)
);

create index if not exists boards_user_id_idx on public.boards (user_id);

-- 행 단위 보안: 자기 것만 읽고 쓴다
alter table public.boards enable row level security;

drop policy if exists "boards: own rows" on public.boards;
create policy "boards: own rows"
  on public.boards
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 인당 최대 2개
create or replace function public.enforce_board_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.boards where user_id = new.user_id) >= 2 then
    raise exception 'board limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists boards_limit on public.boards;
create trigger boards_limit
  before insert on public.boards
  for each row execute function public.enforce_board_limit();
