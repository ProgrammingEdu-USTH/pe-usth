-- ML: API ôn tập hằng ngày từ ngân hàng đề — ghi người học đã được giao câu nào.
--
-- Vì sao cần: đề ôn hằng ngày (POST /api/quiz/generate-review) bốc ngẫu nhiên có trọng số từ
-- mọi câu của bài đã học, nên câu vừa làm hôm qua có thể quay lại hôm nay. Muốn "ưu tiên câu
-- chưa gặp" thì phải biết đã giao câu nào; `review_quiz_results.answers_json` chỉ có lesson_id,
-- không có id câu, và đọc lại JSONB của mọi lần nộp để suy ra là quét cả lịch sử mỗi request.
--
-- Thiết kế:
--  · Một dòng cho mỗi (người, câu): UNIQUE (user_id, question_id). Giao lại thì UPDATE
--    `times`/`seen_at` bằng ON CONFLICT, không thêm dòng. UNIQUE dẫn đầu bằng user_id nên cũng
--    là chỉ mục của khoá ngoại user_id; thêm chỉ mục riêng cho question_id.
--  · `correct` NULL = đã giao nhưng chưa nộp. Ghi lúc GIAO đề (không chờ nộp) vì màn ôn có thể
--    bỏ dở; ghi lúc nộp thì người không nộp sẽ gặp lại đúng những câu đó ngày mai.
--  · Hai khoá ngoại ON DELETE CASCADE: xoá khách (src/auth/guest-cleanup.ts, CASCADE_REFS) hay
--    xoá một câu khỏi ngân hàng thì dòng theo dõi đi theo; nó không phải dữ liệu cần giữ riêng.
--  · Cỡ: ~60 byte/dòng; 10.000 người × 300 câu ≈ 180 MB ở trần (mỗi người gặp hết mọi câu).
--
-- Chỉ THÊM (DB dùng chung bản Django): một bảng mới, không đụng bảng cũ.
-- Hoàn tác: DROP TABLE IF EXISTS "question_seen";

CREATE TABLE IF NOT EXISTS "question_seen" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "question_id" BIGINT NOT NULL,
    "times" INTEGER NOT NULL DEFAULT 1,
    "correct" BOOLEAN,
    "seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answered_at" TIMESTAMPTZ(6),

    CONSTRAINT "question_seen_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "question_seen_times_check" CHECK ("times" >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_question_seen_user_question" ON "question_seen"("user_id", "question_id");
CREATE INDEX IF NOT EXISTS "idx_question_seen_question" ON "question_seen"("question_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_seen_user_id_fkey' AND conrelid = 'question_seen'::regclass) THEN
    ALTER TABLE "question_seen" ADD CONSTRAINT "question_seen_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_seen_question_id_fkey' AND conrelid = 'question_seen'::regclass) THEN
    ALTER TABLE "question_seen" ADD CONSTRAINT "question_seen_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
