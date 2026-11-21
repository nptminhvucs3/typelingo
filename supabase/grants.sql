-- Cấp quyền cho Data API. Project Supabase mới không tự cấp quyền trên bảng tạo bằng SQL
-- (lỗi "permission denied for table ..."). RLS trong schema.sql vẫn giới hạn mỗi người chỉ thấy dữ liệu của mình.
-- Chạy được nhiều lần.
grant usage on schema public to anon, authenticated;
grant select on public.words to anon, authenticated;
grant select, insert, update, delete on public.user_words, public.progress, public.settings to authenticated;
grant select, insert on public.sessions to authenticated;
grant select, update on public.profiles to authenticated;
