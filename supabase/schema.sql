-- TypeLingo – schema Supabase. Chạy toàn bộ file này trong SQL Editor (một lần).
-- An toàn khi chạy lại: dùng "if not exists" / "drop policy if exists".

-- 1) Kho từ chung (ai cũng đọc được, chỉ admin/service role sửa)
create table if not exists public.words (
  id bigint generated always as identity primary key,
  en text not null,
  pos text not null,
  vi text not null,
  topic text not null,
  ipa text not null default '',
  example text not null default '',
  example_vi text not null default '',
  active boolean not null default true,
  unique (en, pos)
);
-- Nâng cấp bảng words cũ (bản trước chưa có phiên âm/ví dụ/loại 'phr' = cụm từ)
alter table public.words add column if not exists ipa text not null default '';
alter table public.words add column if not exists example text not null default '';
alter table public.words add column if not exists example_vi text not null default '';
alter table public.words drop constraint if exists words_pos_check;
alter table public.words add constraint words_pos_check check (pos in ('n','v','adj','adv','prep','conj','phr'));

-- 2) Từ riêng của từng người (cả từ đã xoá: deleted = true để lan sang máy khác)
create table if not exists public.user_words (
  user_id uuid not null references auth.users(id) on delete cascade,
  en text not null,
  pos text not null,
  vi text not null,
  topic text not null default 'Từ của tôi',
  ts bigint not null,
  deleted boolean not null default false,
  primary key (user_id, en, pos)
);

-- 3) Tiến độ từng từ. word_id có dạng 'english|pos'
create table if not exists public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null,
  box smallint not null default 0,
  ok integer not null default 0,
  miss integer not null default 0,
  fav boolean not null default false,
  ts bigint not null,
  primary key (user_id, word_id)
);

-- 4) Cài đặt
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  ts bigint not null
);

-- 5) Lịch sử từng lượt chơi
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  played_at timestamptz not null default now(),
  score integer not null,
  wpm integer not null,
  accuracy integer not null,
  words_done integer not null default 0,
  topic text
);
-- Bản v2: chế độ chơi + XP của lượt (để chuỗi ngày / XP đồng bộ giữa các máy)
alter table public.sessions add column if not exists mode text;
alter table public.sessions add column if not exists xp integer;
create index if not exists sessions_user_time on public.sessions (user_id, played_at desc);

-- 6) Hồ sơ (tên hiển thị – dùng cho bảng xếp hạng sau này)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Bảo mật theo từng dòng (RLS) =====
alter table public.words enable row level security;
alter table public.user_words enable row level security;
alter table public.progress enable row level security;
alter table public.settings enable row level security;
alter table public.sessions enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "words_read" on public.words;
create policy "words_read" on public.words for select using (true);

drop policy if exists "user_words_own" on public.user_words;
create policy "user_words_own" on public.user_words for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "progress_own" on public.progress;
create policy "progress_own" on public.progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "settings_own" on public.settings;
create policy "settings_own" on public.settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sessions_own_read" on public.sessions;
create policy "sessions_own_read" on public.sessions for select using (auth.uid() = user_id);
drop policy if exists "sessions_own_insert" on public.sessions;
create policy "sessions_own_insert" on public.sessions for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_own_read" on public.profiles;
create policy "profiles_own_read" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ===== Quyền cho Data API (giống supabase/grants.sql) =====
grant usage on schema public to anon, authenticated;
grant select on public.words to anon, authenticated;
grant select, insert, update, delete on public.user_words, public.progress, public.settings to authenticated;
grant select, insert on public.sessions to authenticated;
grant select, update on public.profiles to authenticated;
