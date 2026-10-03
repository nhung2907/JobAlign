-- JobAlign — schema ban đầu (lát cắt 1 + 2).
-- Chạy trong Supabase SQL Editor, hoặc `supabase db push` nếu dùng Supabase CLI.
-- Mọi bảng bật RLS: người dùng chỉ đọc/ghi dữ liệu của chính mình (08-lua-chon-cong-nghe-he-thong.md, mục 6).

-- Hồ sơ năng lực đã xác nhận (UR-1.1). Một hồ sơ mỗi tài khoản; CV chỉ đọc một lần.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  cv_path    text,
  updated_at timestamptz not null default now()
);

-- Kỳ vọng nghề nghiệp (UR-1.2), lưu ở cấp tài khoản.
create table if not exists public.preferences (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- JD người dùng đã phân tích (UR-1.3). Kết quả bóc tách lưu trong `data` để mở lại không gọi LLM (NFR-2).
-- Điểm số không lưu: bộ chấm là hàm thuần, tính lại luôn ra cùng kết quả (NFR-5).
create table if not exists public.jobs (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  source       text not null check (source in ('paste', 'file', 'url', 'sample')),
  url          text,
  title        text not null,
  company      text not null default '',
  content_hash text not null,
  data         jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, content_hash)
);
create index if not exists jobs_user_idx on public.jobs (user_id, created_at desc);

alter table public.profiles    enable row level security;
alter table public.preferences enable row level security;
alter table public.jobs        enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own preferences" on public.preferences;
create policy "own preferences" on public.preferences
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own jobs" on public.jobs;
create policy "own jobs" on public.jobs
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Tệp CV (Supabase Storage): bucket riêng tư, mỗi người một thư mục `<user_id>/…`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 10485760, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
])
on conflict (id) do nothing;

drop policy if exists "own cv files - read" on storage.objects;
create policy "own cv files - read" on storage.objects
  for select to authenticated using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own cv files - insert" on storage.objects;
create policy "own cv files - insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own cv files - delete" on storage.objects;
create policy "own cv files - delete" on storage.objects
  for delete to authenticated using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
