-- ML Tuần 2 (sinh trắc nghiệm, docs/ml-pipeline.md §7): kho câu do pipeline sinh, chờ duyệt.
--
-- Vì sao bảng riêng, không ghi thẳng vào lessons.content_json: câu sinh ra mới qua lọc
-- tự động (tầng A), chưa ai duyệt; trộn vào step_2.mcq là đưa câu chưa duyệt tới học viên
-- và sửa content_json của bài đang có người học. Ở đây mọi câu vào với status 'draft'.
--
-- Chỉ THÊM (DB dùng chung bản Django): một bảng mới, không đụng bảng cũ.
-- · khoá chính BIGSERIAL, thời gian timestamptz;
-- · khoá ngoại course_id có chỉ mục dẫn đầu (course_id, module_code);
-- · content_hash UNIQUE: chặn trùng ở tầng DB, script ghi bằng ON CONFLICT DO NOTHING;
-- · CHECK cho type/status/difficulty (giá trị theo §2, §7 và questionnaire-spec §2).
-- Không trỏ vào users nên không phải thêm vào src/auth/guest-cleanup.ts.
--
-- Hoàn tác: DROP TABLE IF EXISTS "question_bank"; — chỉ chứa câu sinh tự động, không có
-- dữ liệu người học; câu đã 'approved' thì xuất ra trước (scripts/gen-questions/out/).

CREATE TABLE IF NOT EXISTS "question_bank" (
    "id" BIGSERIAL NOT NULL,
    "course_id" TEXT NOT NULL,
    "lesson_code" TEXT NOT NULL,
    "module_code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "difficulty" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source" TEXT NOT NULL DEFAULT 'gen',
    "prompt_version" TEXT,
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "question_bank_type_check" CHECK ("type" IN ('mcq', 'code')),
    CONSTRAINT "question_bank_status_check" CHECK ("status" IN ('draft', 'approved', 'rejected')),
    CONSTRAINT "question_bank_difficulty_check"
        CHECK ("difficulty" IS NULL OR "difficulty" IN ('basic', 'intermediate', 'advanced'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "question_bank_content_hash_key" ON "question_bank"("content_hash");

CREATE INDEX IF NOT EXISTS "question_bank_course_id_module_code_idx" ON "question_bank"("course_id", "module_code");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_bank_course_id_fkey' AND conrelid = 'question_bank'::regclass) THEN
    ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
