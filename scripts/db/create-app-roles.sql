-- DB9 — hai role riêng thay cho neondb_owner. Chạy bằng neondb_owner trong Neon SQL Editor, MỘT lần cho
-- mỗi branch/DB. ĐÃ chạy và kiểm trên branch Neon `test` ngày 19/11/2026; DB thật CHƯA chạy.
--
-- Thay <MAT_KHAU_APP> và <MAT_KHAU_MIGRATOR> bằng chuỗi ngẫu nhiên (≥ 24 ký tự, tạo bằng trình quản lý
-- mật khẩu), rồi XOÁ chúng khỏi lịch sử trình soạn thảo. Không ghi mật khẩu vào repo, chat hay log.
--
--   pe_app       chỉ SELECT/INSERT/UPDATE/DELETE + dùng sequence. Không DDL, không đọc _prisma_migrations.
--                Dùng cho DATABASE_URL của backend (host -pooler), job dọn dữ liệu và bài đo tải.
--   pe_migrator  CHỦ SỞ HỮU các bảng: dùng cho DIRECT_URL (host KHÔNG -pooler) khi `prisma migrate deploy`.
--                Không dùng neondb_owner làm chủ vì Neon từ chối `GRANT neondb_owner TO ...`.
--
-- Hoàn tác (đưa chủ sở hữu về neondb_owner trước khi bỏ role):
--   DO $$ DECLARE t text; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
--     EXECUTE format('ALTER TABLE public.%I OWNER TO neondb_owner', t); END LOOP; END $$;
--   (làm tương tự cho enum), rồi DROP OWNED BY pe_app; DROP ROLE pe_app; DROP OWNED BY pe_migrator; DROP ROLE pe_migrator;

CREATE ROLE pe_app      LOGIN PASSWORD '<MAT_KHAU_APP>'      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE pe_migrator LOGIN PASSWORD '<MAT_KHAU_MIGRATOR>' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

-- neondb_owner phải là thành viên pe_migrator thì mới chuyển chủ sở hữu bảng sang nó được.
GRANT pe_migrator TO neondb_owner;
GRANT CONNECT ON DATABASE neondb TO pe_migrator, pe_app;
GRANT USAGE, CREATE ON SCHEMA public TO pe_migrator;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO pe_migrator', r.tablename);
  END LOOP;
  FOR r IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public' AND t.typtype = 'e' LOOP
    EXECUTE format('ALTER TYPE public.%I OWNER TO pe_migrator', r.typname);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO pe_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pe_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pe_app;
REVOKE ALL ON TABLE _prisma_migrations FROM pe_app;

-- Chặn truy vấn chạy vô hạn và transaction bỏ quên. CHỈ có hiệu lực với kết nối TRỰC TIẾP (host không -pooler):
-- đã đo trên branch thử, qua pooler của Neon hai giá trị này không áp (SHOW trả 0 / 5min). Với đường ứng dụng
-- (qua pooler) cái chặn thật là TX_OPTIONS (transaction tối đa 20 s) và DB_CONNECT_TIMEOUT_MS.
ALTER ROLE pe_app SET statement_timeout = '30s';
ALTER ROLE pe_app SET idle_in_transaction_session_timeout = '15s';

-- Bảng mới tạo về sau bởi migration (chạy bằng pe_migrator) tự cấp quyền cho pe_app.
ALTER DEFAULT PRIVILEGES FOR ROLE pe_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pe_app;
ALTER DEFAULT PRIVILEGES FOR ROLE pe_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO pe_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pe_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO pe_app;
