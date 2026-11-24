# Đặc tả bộ câu hỏi đầu vào và cách xếp module

Khoá áp dụng: `python_advanced` (Advanced Python, 48 bài, 8 module). Môn SQL và ML dùng cùng
định dạng khi có giáo trình; chỉ đổi `course_id` và danh sách module.

Tài liệu này là đầu vào cho ba việc khác, nhưng không việc nào phải chờ nó:

- **FE (Trí Thành):** màn `/onboarding` (`OnboardingSurveyView.tsx`) đang dùng 5 câu giả viết cứng.
  Dữ liệu giả `frontend/src/lib/mock/questionnaire.json` nên theo đúng hình dạng ở mục 2 và 5.
- **ML (Nghĩa, Tuần 3): dựng questionnaire và API.** Cài đặt mục 3 và 5.
- **Tài liệu (Nam, N4):** câu xếp level theo module. Cột của bảng Nam khớp với trường ở mục 2.

## 0. Đã cài đặt (24/11/2026) — đọc mục này trước khi nối FE

Code: `src/questionnaire/` (logic thuần + service + controller), nạp câu bằng
`scripts/seed-questionnaire.ts`. Đã chạy thật trên branch Neon thử: bộ câu version 1 đang bật.

**Route** (gateway thêm tiền tố `/api`; cả route theo sheet và route theo mục 5 đều có):

| Route | Quyền | Trả về |
|---|---|---|
| `GET /api/questionnaire` (tuỳ chọn `?course_id=`, mặc định `python_advanced`) | công khai | `{ ok, questionnaire_id, course_id, version, title, params, modules, self_assess, items }` — đúng `QuestionnairePayload` của `onboarding-questionnaire.ts`, **không có** `correct`/`explanation` |
| `GET /api/questionnaire/:courseId` | công khai | như trên |
| `POST /api/questionnaire/:courseId/submit` body `{ questionnaire_id?, answers, self? }` | JWT (khách cũng được) | `{ ok, done, updated, start_module, start_lesson_no, module_scores, review_modules, level_title, skipped_all, score, total, level, explanations, review }` |
| `POST /api/survey` hoặc `POST /api/user/survey` | JWT | như cũ; gửi thêm trường `questionnaire: { course_id?, questionnaire_id?, answers, self? }` thì kèm `placement: <kết quả như dòng trên>` |
| `GET /api/me/questionnaire/:courseId` | JWT | kết quả đã lưu, hoặc `{ ok, done: false }` |

`/api/placement/*` (điểm tổng, của Nhân) vẫn chạy và đọc CÙNG bộ câu đang bật: `parseQuestions` nhận
cả định dạng mới. FE dùng tiếp `/api/placement/*` cũng được, nhưng chỉ `/api/questionnaire/*` có xếp module.

Lỗi: id câu lạ hoặc chỉ số ngoài khoảng → 400 (câu tiếng Việt nói câu nào); `questionnaire_id` khác bản đang
bật → 409 "tải lại trang"; chưa có bộ câu cho khoá → 404; trường lạ (ví dụ `score`) → 400.

**Lệch so với các mục dưới (mục dưới viết trước khi đối chiếu DB):**

- **Giáo trình là 11 module, 179 bài, không phải 8 module, 48 bài.** DB (thật và thử) và `curricula.json`
  của FE dùng gói `scripts/pe-da/out/lessons.json`: M1 = Python nền tảng, M2 = NumPy… Bảng module ở mục 3
  là của gói pe-v4, KHÔNG dùng. Bài đầu từng module tính lúc chạy từ bảng `lessons` (M2 bắt đầu ở bài 19).
- **Hỏi M1–M8, 3 câu mỗi module = 24 câu** (sheet: ít nhất 20). M9–M11 là ôn tập và thực hành tổng hợp nên
  không hỏi; đạt hết M1–M8 thì bắt đầu ở M9 (bài 160).
- **Ngưỡng 0,66 thay cho 0,67**: với 3 câu/module điểm chỉ có 0; 0,33; 0,67; 1. Giữ 0,67 thì 2/3 = 0,6667
  là trượt, tức phải đúng cả ba câu. 0,66 nghĩa là đúng ≥ 2/3. Tham số nằm trong bộ câu, đổi bằng bản mới.
- **Câu lấy từ `step_2.mcq` của chính các bài**, chỉ nhận câu qua luật A2–A5 (đáp án đúng không dài vượt
  trội nên không đoán được bằng "chọn câu dài nhất") và không dựa vào ngữ cảnh bài ("ở trên", "của bài",
  "trong sơ đồ"…). Ba câu của một module lấy từ đầu, giữa, cuối module, gắn mức basic/intermediate/advanced.
  Danh sách câu để duyệt: `scripts/placement/questionnaire-python_advanced.json` (có đáp án).
- **Chưa có câu tự khai** (`self_assess` rỗng): logic đã hỗ trợ (`w = 0,2`), chờ câu của Nam.
- **Không có bảng `placement_results`.** Kết quả lưu ở hai chỗ, trong một transaction:
  `placement_attempts` (bảng của /placement, một dòng mỗi người mỗi bản câu hỏi, nộp lại thì CẬP NHẬT) và
  `surveys.data_json.placement[courseId]` của bản survey MỚI NHẤT (gộp vào, không tạo bản mới, để không
  mất `career_target` mà lộ trình đang dùng). POST /survey về sau mang `placement` sang bản mới.
  Người chưa từng khảo sát thì có thêm một bản survey chỉ chứa `placement`.

**Nạp hoặc đổi bộ câu** (mặc định chạy thử, không chạm DB):

```bash
npx ts-node scripts/seed-questionnaire.ts                                   # dựng lại từ pe-da, ghi file để duyệt
npx ts-node scripts/seed-questionnaire.ts --file=data/questionnaire/x.json  # bộ câu Nam soạn (định dạng mục 2)
npx ts-node scripts/seed-questionnaire.ts --apply --activate --expected-host=<host của DIRECT_URL>
```

## 1. Hiện trạng và vì sao cần đặc tả mới

| Thành phần | Tình trạng |
|---|---|
| `POST /user/survey` → `UserService.submitSurvey` | Lưu khảo sát TỰ KHAI (11 trường chuỗi của `SurveyDto`: nghề, mục đích, kinh nghiệm…) vào `surveys.data_json`, đặt `questionnaire_completed = true`, sinh lộ trình. |
| `pickRoadmapTemplate` | Lấy `career_target`, không có thì `language`, rồi `domain`. Không có câu kiểm tra kiến thức nào, không xếp module. |
| Bảng `questionnaires` (`version, title, questions_json, is_active`) | Có trong `schema.prisma`, chưa code nào đọc. Bộ câu lưu ở đây, **không cần migration**. |
| Khách | Bỏ qua bảng hỏi: `AuthService.guest` đặt `questionnaireCompleted: true`. Giữ nguyên. |
| Màn `/onboarding` (FE) | 5 câu giả, `correctIndex` nằm ở client, xếp module bằng TỔNG số câu đúng (0–2 → Chặng 1, 3–4 → Chặng 2, 5 → Chặng 5). |

Hai lỗi của bản giả mà đặc tả này sửa:

1. **Đáp án nằm ở client.** Ai mở DevTools cũng đọc được `correctIndex`. Bản thật để server chấm;
   `correct` và `explanation` không bao giờ rời server (cùng nguyên tắc `stripAnswers` ở
   `src/quizzes/quizzes.service.ts`).
2. **Tổng điểm không nói người học yếu ở đâu.** Đúng 3/5 câu có thể là giỏi pandas nhưng chưa biết
   subprocess. Chấm theo TỪNG MODULE mới chọn được điểm bắt đầu.

## 2. Định dạng bộ câu (`questionnaires.questions_json`)

```jsonc
{
  "course_id": "python_advanced",
  "version": 1,
  "params": { /* mục 4; để trong bộ câu để đổi tham số không cần deploy */ },
  "self_assess": [
    {
      "id": "sa-m6",
      "module_code": "M6",
      "question": "Bạn đã dùng pandas (DataFrame, groupby) tới mức nào?",
      "options": [
        { "text": "Chưa nghe tới",         "value": 0 },
        { "text": "Đã đọc qua",            "value": 0.33 },
        { "text": "Đã dùng vài lần",       "value": 0.67 },
        { "text": "Dùng thường xuyên",     "value": 1 }
      ]
    }
  ],
  "items": [
    {
      "id": "q-m1-1",
      "module_code": "M1",
      "level": "basic",                    // basic | intermediate | advanced
      "question": "os.getppid() trả về gì?",
      "code": null,                        // tuỳ chọn, hiện dạng khối code
      "options": [
        { "text": "PID của chính process hiện tại" },
        { "text": "PID của process cha đã tạo ra process hiện tại" },
        { "text": "Số process con đang chạy" }
      ],
      "correct": 1,                        // CHỈ server đọc
      "explanation": "Nối ppid → pid ta đi ngược được cây process."  // CHỈ server đọc
    }
  ]
}
```

Luật của định dạng:

- **Lựa chọn dùng khoá `text`**, không dùng `title`. `normalizeQuestion` chỉ đọc `text`/`label`;
  khoá `title` cho ra 4 nút trắng mà không lỗi nào báo (bẫy đã ghi trong AGENTS.md). Nhờ vậy câu do
  pipeline sinh trắc nghiệm và bảng N4 của Nam đổ thẳng vào được.
- **`module_code`** lấy từ phần đầu của `lessons.module`: `"M1 · Tiến trình và subprocess"` → `M1`.
- Mỗi câu chỉ kiểm MỘT ý; lựa chọn sai là lỗi người mới hay mắc (cùng luật với bảng N4).
- `self_assess` là tuỳ chọn: thiếu câu tự khai của module nào thì module đó chỉ chấm bằng câu làm thật.
- Một bộ câu đang dùng là hàng có `is_active = true` của khoá; đổi bộ câu = thêm hàng `version` mới.

## 3. Quy tắc xếp module

Đầu vào: `answers = { [item_id]: optionIndex | null }`, `self = { [sa_id]: optionIndex | null }`.

**Bước 1: điểm làm thật theo module.**
`test[m] = số câu đúng của m / số câu của m`. Câu bỏ qua (`null`) tính là SAI
(`skip_policy = "wrong"`); người không biết thường bấm bỏ qua, nên coi là chưa thạo là an toàn hơn.

**Bước 2: trộn với tự khai.**
`final[m] = (1 − w) × test[m] + w × self[m]`, với `w = self_assess_weight`.
Không có câu tự khai của m thì `final[m] = test[m]`.
Tự khai chỉ được trọng số nhỏ (mặc định 0,2) vì người học hay tự đánh giá cao hơn thực tế.

**Bước 3: chọn module bắt đầu.**
Đi theo thứ tự M1 → M7, `start_module` = **module đầu tiên có `final[m] < mastery_threshold`**.
Nếu M1–M7 đều đạt thì bắt đầu ở **M8** (dự án). M8 không có câu hỏi: hai bài DA01, DA02 là bài
tổng hợp M5–M7 và đều là bài cửa tự kiểm tra (`step_4.gate`).

**Bước 4: đầu ra.**

```jsonc
{
  "start_module": "M2",
  "start_lesson_no": 8,          // sort_order của bài đầu module, xem bảng dưới
  "module_scores": { "M1": 1, "M2": 0.5, "M3": 1, "...": 0 },
  "review_modules": ["M5"],      // module SAU điểm bắt đầu mà vẫn dưới ngưỡng
  "level_title": "Khởi đầu vững chắc",
  "skipped_all": false
}
```

`level_title` theo số module M1–M7 đạt ngưỡng (giữ đúng ba tên FE đang dùng):
0–2 → "Khởi đầu vững chắc"; 3–5 → "Nền tảng vững vàng"; 6–7 → "Sẵn sàng bứt phá".

**Trường hợp biên.**

- Bỏ qua mọi câu → `start_module = "M1"`, `skipped_all = true` (FE có thể hiện lời mời làm lại).
- Khách: không làm bảng hỏi, vào thẳng bài 1 như hiện tại.
- Xếp module CHỈ là gợi ý điểm bắt đầu; không khoá bài nào và không ghi `lesson_progress`.
  Người học vẫn mở được mọi bài. Vì thế xếp sai không làm mất gì, chỉ tốn thời gian người học.

**Bài đầu của từng module** (đo từ `scripts/pe-v4/out-advanced/lessons/*.json`):

| Module | Tên | Số bài | Bài đầu (sort_order) |
|---|---|---|---|
| M1 | Tiến trình và subprocess | 7 | P01 (1) |
| M2 | Đa luồng | 6 | T01 (8) |
| M3 | GUI Tkinter và dự án | 7 | G01 (14) |
| M4 | Nhập dữ liệu, SQL và tra cứu | 5 | X01 (21) |
| M5 | NumPy | 6 | N01 (26) |
| M6 | pandas | 9 | PD01 (32) |
| M7 | Matplotlib | 6 | M01 (41) |
| M8 | Dự án DA | 2 | DA01 (47) |

Đừng ghi cứng bảng này vào code: tính `start_lesson_no` bằng `min(sort_order)` của các bài có
`module` bắt đầu bằng mã đó, để giáo trình đổi thì kết quả tự đổi theo.

## 4. Tham số cần hiệu chỉnh

| Tham số | Mặc định | Ý nghĩa và cách chỉnh |
|---|---|---|
| `items_per_module` | 2 (tổng 14 câu cho M1–M7) | 3 câu chính xác hơn nhưng bộ dài 21 câu. Bắt đầu bằng 2 cho người học khỏi bỏ dở. |
| `mastery_threshold` | 0,67 | Với 2 câu/module, điểm làm thật chỉ có 0; 0,5; 1, nên ngưỡng này nghĩa là phải đúng CẢ HAI câu. |
| `self_assess_weight` (`w`) | 0,2 | Với `w = 0,2`, đúng 1/2 câu cộng tự khai cao nhất chỉ được 0,6 < 0,67: tự khai không kéo được người làm sai lên mức thạo, nhưng đúng 2/2 mà tự khai "chưa nghe" vẫn được 0,8 (đạt). Cố ý như vậy. |
| `skip_policy` | `"wrong"` | Đổi sang `"exclude"` (bỏ câu khỏi mẫu số) nếu đo thấy nhiều người bị xếp quá thấp vì bấm bỏ qua. Module mà mọi câu đều bị loại thì tính là chưa đạt. |
| `max_duration_min` | 8 | Chỉ để FE hiện "khoảng 8 phút"; server không cắt giờ. |

Tham số nằm trong `questions_json.params`, nên đổi = thêm `version` mới, không phải deploy.

**Cách đo để chỉnh tham số (sau khi có người dùng thật):**

- *Xếp quá cao:* người học được xếp vào module m nhưng bỏ dở bài đầu của m (`learning_events`
  `X-Lesson.Abandon`) hoặc làm sai nhiều câu `step_2.mcq` của bài đó → tăng ngưỡng hoặc giảm `w`.
- *Xếp quá thấp:* người học hoàn thành các bài của `start_module` nhanh bất thường với điểm tối đa →
  giảm ngưỡng.
- Mỗi lần đổi tham số ghi số đo trước/sau vào tài liệu này.

## 5. API dự kiến (việc "dựng questionnaire", Tuần 3)

- `GET /questionnaire/:courseId` → bộ câu đang `is_active` **đã bỏ `correct` và `explanation`**.
- `POST /questionnaire/:courseId/submit` với body `{ answers, self }` → server chấm theo mục 3, trả
  đầu ra ở bước 4 kèm `explanation` từng câu (lúc này đã nộp nên được xem).
- Kiểm `answers` bằng DTO: id câu phải thuộc bộ câu đang dùng, chỉ số lựa chọn phải nằm trong khoảng;
  id lạ thì 400 (`throw`, không `res.json()` thủ công).
- Chỉ người đã đăng nhập; trang công khai gọi bằng `apiFetchSessionOnly`, không dùng `apiFetch`
  (`apiFetch` tự tạo tài khoản khách).

**Lưu kết quả: KHÔNG ghi vào bảng `surveys`.** `RoadmapService` (`src/roadmap/roadmap.service.ts`)
đọc bản survey MỚI NHẤT của người dùng rồi đưa `data_json` vào `pickRoadmapTemplate`. Ghi kết quả xếp
module vào `surveys` sẽ thành bản mới nhất, không có `career_target`/`language`/`domain`, và lộ trình
đã chọn của người đó lặng lẽ quay về danh sách mặc định. Kết quả lưu vào bảng riêng do chính việc
Tuần 3 tạo (chỉ thêm, theo quy ước migration):

```
placement_results(id BIGSERIAL, user_id INT FK users, course_id, questionnaire_version INT,
                  answers JSONB, result JSONB, created_at timestamptz DEFAULT now())
index (user_id, course_id)
```

Bảng này cũng phải được thêm vào danh sách xoá con trong `src/auth/guest-cleanup.ts` (spec ở đó đọc
migration và đỏ nếu thiếu).

Khảo sát định hướng hiện có (`POST /user/survey`) giữ nguyên; hai thứ độc lập.

## 6. Ví dụ tính tay

Tham số mặc định: 2 câu/module, ngưỡng 0,67, `w = 0,2`, bỏ qua tính là sai.

| # | Trả lời | Tính | Kết quả |
|---|---|---|---|
| 1 | M1 2/2, M2 1/2, còn lại 2/2; không tự khai | M1 = 1 đạt; M2 = 0,5 < 0,67 | Bắt đầu **M2** (bài 8); đạt 6 module → "Sẵn sàng bứt phá" |
| 2 | M1 1/2, tự khai M1 "Dùng thường xuyên" (1) | 0,8 × 0,5 + 0,2 × 1 = 0,6 < 0,67 | Bắt đầu **M1**: tự khai không bù được câu sai |
| 3 | M1 2/2, tự khai M1 "Chưa nghe tới" (0) | 0,8 × 1 + 0,2 × 0 = 0,8 | M1 **đạt** |
| 4 | M1–M2 2/2, M3 0/2, M4–M7 2/2 | M3 = 0 là module đầu dưới ngưỡng | Bắt đầu **M3** (bài 14); `review_modules = []`; đạt 6 → "Sẵn sàng bứt phá" |
| 5 | M1–M4 2/2, M5 1/2, M6 2/2, M7 0/2 | M5 = 0,5 là module đầu dưới ngưỡng | Bắt đầu **M5** (bài 26); `review_modules = ["M7"]`; đạt 5 → "Nền tảng vững vàng" |
| 6 | M1–M7 đều 2/2 | mọi module đạt | Bắt đầu **M8** (bài 47, DA01) |
| 7 | Bỏ qua tất cả | mọi module = 0 | Bắt đầu **M1**, `skipped_all = true`; đạt 0 → "Khởi đầu vững chắc" |

## 7. Câu hỏi còn mở (đã có mặc định, không chặn ai)

- **Thứ tự tuyến tính M1 → M7 có hợp lý không?** M3 (Tkinter) không phải tiền đề của M5–M7 (dữ liệu).
  Ví dụ 4 xếp người giỏi dữ liệu vào Tkinter. Mặc định giữ tuyến tính vì giáo trình được viết theo
  thứ tự đó; khi Nam xong bảng nhãn "bài tiên quyết" (việc gắn nhãn khái niệm và module, 19–23/11)
  thì đổi bước 3 thành "module đầu dưới ngưỡng mà mọi tiên quyết của nó đã đạt".
- **Môn SQL và ML:** dùng nguyên định dạng và quy tắc; chỉ cần bảng module của môn đó.
