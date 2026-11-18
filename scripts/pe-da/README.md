# pe-da — bộ "Python cho Data Analyst"

Nội dung của khoá `python_advanced` đang chạy. Nguồn là gói giáo trình python-da
(biên soạn riêng, ngoài repo này); `source/course.json` là bản đã bỏ trường `html`
của gói đó — bản HTML dựng lại được từ `reading`, giữ lại chỉ làm file phình gấp đôi.

> **Đừng chép con số vào file này.** Số bài, số màn, số ca chấm, số đoạn code
> trôi theo từng đợt sửa nội dung; bản của file này từng ghi 172 bài / 10 module
> trong khi khoá đã là 179 bài / 11 module. Con số hiện hành nằm ở bảng "Mốc nền"
> trong [AGENTS.md](../../AGENTS.md) và được `node scripts/check-moc-nen.mjs` đối
> chiếu với cây mã.

Hình dạng bài đích: [SCHEMA.md](SCHEMA.md). Khoá cũ 48 bài vẫn nằm ở
[../pe-v4/](../pe-v4/), giữ lại nhưng không còn xuất bản — xem AGENTS.md.

## Dựng và kiểm

```bash
py scripts/pe-da/build.py              # course.json -> out/ + chép 80 ảnh sang public/static/da/
py scripts/pe-da/check.py --strict     # cấu trúc (CI chạy bản này)
py scripts/pe-da/sync_curricula.py     # -> frontend/src/lib/curricula.json

npm i --no-save pyodide@314.0.7
node scripts/pe-da/check-pyodide.mjs            # mọi bài chạy được trong trình duyệt
node scripts/pe-da/check-pyodide.mjs NP02,VZ01 --verbose   # vài bài, in chi tiết
node scripts/pe-da/check-practice.mjs           # chấm các BÀI TẬP bằng ca chấm thật
```

## Ba lớp kiểm, mỗi lớp bắt một loại lỗi

Phần nguồn là giáo trình ĐỌC, và nó có một thứ kiểm được quan trọng hơn mọi thứ
khác: **mỗi đoạn code trong bài đều khai sẵn kết quả nó in ra**. Lời giảng viết
"Kết quả: 21" mà chạy thật ra 23 thì không ngoại lệ nào được ném, không log nào
đỏ — chỉ có học viên ngồi tự hỏi mình sai ở đâu. (Phần luyện tập, trắc nghiệm và
bài tập chấm do `practice.json` và `build.py` thêm vào có bộ kiểm riêng —
`check-practice.mjs` và các luật trong `check.py`; xem mục cuối.)

1. **Dựng lại rồi so với bản đã commit.** `out/` là thứ được nạp vào DB. Sửa
   `build.py` mà quên commit bản dựng là hai nguồn nói hai chuyện.
2. **`check.py` — cấu trúc.** `sort_order` liên tục từ 1 đến số bài của khoá (bài
   tra theo `(course_id, sort_order)`, một lỗ hổng là một bài không mở được); số
   câu luyện tập khớp nguồn; hình trỏ tới file có thật và là PNG; loại khối nằm
   trong các loại renderer dựng được (xem [SCHEMA.md](SCHEMA.md)); nút Chạy chỉ
   hiện ở bài chạy được.
3. **`check-pyodide.mjs` — nội dung.** Chạy code từng bài trong CHÍNH Pyodide của
   nền tảng (`pyodide@314.0.7`, cài bằng `npm i --no-save`) và CHÍNH
   `frontend/public/static/js/studio-harness.py` của trình duyệt, so kết quả in
   ra với `expected`.

Chạy **dồn theo bài**, không rời từng đoạn: bản code người học đọc (`displayCode`)
viết để chạy nối tiếp — đoạn 2 của NP02 dùng `np` mà chỉ đoạn 1 mới
`import numpy as np`. Chạy rời là tự tạo ra lỗi không có thật.

## Vì sao lớp 3 không thừa

Gói gốc kiểm nội dung trên một bộ phiên bản thư viện riêng
(`requirements-tested.txt` của nó: ở lần ghi đầu là matplotlib 3.11.2 / numpy
2.5.4 / pandas 3.1.0 — chưa đối chiếu lại với gói hiện hành), còn nền tảng chạy
Pyodide 314.0.7 (Python 3.14.2 · numpy 2.4.6 · pandas 3.0.2 · matplotlib 3.10.8).
Dòng "đạt, 0 lỗi" trong README của gói đúng với nền của họ, không nói gì về nền
này.

Lớp 3 từng tìm ra hai chỗ khoảng lệch đó cắn khi nền tảng còn ở Pyodide 0.27.7:
VZ07 (`ax.boxplot(tick_labels=…)` cần matplotlib ≥ 3.9) và VZ03
(`fig.autofmt_xdate()` xung đột `layout="constrained"` ở 3.8.4, in UserWarning
chen vào giữa kết quả bài ghi). Cả hai hết lỗi sau khi nâng lên 314.0.7 và hằng
`LECH_PHIEN_BAN` trong `build.py` nay trống — giữ cái móc đó lại, lần nâng sau
sẽ có thứ lệch theo chiều ngược lại. **Sửa nội dung xong thì xoá dòng tương
ứng**, đừng để nó thành danh sách bỏ qua cho yên chuyện.

## Nạp vào DB

`scripts/seed-python-da.ts` — chạy thử trước, `--apply` phải kèm `--backup`. Nó
XOÁ `lesson_progress` của khoá: đúng khi thay cả khoá, sai khi chỉ sửa vài chữ.
Sửa nội dung vài bài thì dùng `scripts/update-lesson-content.ts` (đường nạp an
toàn, không đụng tiến độ). Sau MỌI lần nạp vẫn phải chạy `sync_curricula.py`.

## Phần nào của một bài đến từ đâu

Gói nguồn (`source/course.json`) chỉ có phần ĐỌC; nó không có trắc nghiệm, không
scaffold, không ca chấm code học viên và build **không tự sinh** chúng. Các phần
đó do `source/practice.json` (câu luyện tập, trắc nghiệm, bài tập kèm `tests`) và
`build.py` thêm vào, nên chúng có bộ kiểm riêng — `check-practice.mjs` chạy lời
giải mẫu qua ca chấm rồi đòi các biến thể sai TRƯỢT. Hệ quả phải nhớ:

- **Quiz ôn tập sống nhờ `step_2.mcq`.** `QuizzesService.collectQuestions()` đọc
  `content_json.step_2.mcq`; kho chỉ đủ khi các bài có trắc nghiệm, dưới
  `MIN_POOL = 5` thì quiz không dựng được. Đổi số câu mỗi bài ở `build.py`
  (`SO_CAU_MCQ`) là đổi kích cỡ kho này.
- **Bảng từng bước** của khối code đọc từ `traces.json` do `gen_traces.py` sinh
  riêng (chậm, cần numpy/pandas trên máy) — build chỉ đọc và báo lỗi nếu mã của
  khối đã đổi mà vết chưa sinh lại.
- 10 "hình" của VZ20–VZ22/VZ26 là file HTML Plotly 4,7 MB mỗi cái, không chép sang
  repo; lời giảng bốn bài đó mô tả biểu đồ bằng chữ, và chúng vốn thuộc nhóm phải
  chạy trên máy vì plotly không có wheel.
