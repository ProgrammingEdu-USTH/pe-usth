"""Dựng PHAN-VIEC-NHOM.pdf: chia việc theo NHÓM (FE, BE, DB, ML, Tài liệu).

    py scripts/docs/build-phan-viec.py

Dữ liệu: phan-viec-nhom.json (mỗi việc có "nhom") và phan-viec-tasks.json (chi tiết "Cách làm" của việc nhỏ,
tham chiếu qua "tu"). Không tính ngày công. Arena làm ở repo/nhánh khác nên không có trong file này.
SRS mục 11 không ghi lại ở đây.
"""
import json
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
DATA = json.load(open(HERE / "phan-viec-nhom.json", encoding="utf-8"))
OLD = {t["code"]: t for t in json.load(open(HERE / "phan-viec-tasks.json", encoding="utf-8"))}
NGAY_LAP = DATA["ngay_lap"]
NGUOI = ["Nam Nguyễn", "Nhân", "Kiên", "Nghĩa", "Trí Thành", "Đức", "Thái"]
VAI_NGUOI = {"Nam Nguyễn": "Giáo trình", "Nhân": "DB, điều phối, review", "Kiên": "Arena (tự làm, tự báo cáo)", "Nghĩa": "BE (kiểm tra, tối ưu, sửa lỗi) rồi ML",
             "Trí Thành": "FE (asset và code)", "Đức": "FE (asset và code)", "Thái": "FE (asset và code)"}
NV1_END = "2026-11-09"  # việc bắt đầu trước ngày này thuộc nhiệm vụ 1 (đến hết Chủ nhật 8/11)


def ai_list(item):
    return [x.strip() for x in re.sub(r"\(.*?\)", "", item["ai"]).replace(" và ", ",").split(",") if x.strip()]


def goi_y(item):
    if item.get("goi_y"):
        return item["goi_y"]
    out = []
    many = len(item.get("tu", [])) > 1
    for c in item.get("tu", []):
        f = OLD[c]["fields"]
        lines = [re.sub(r"^\d+\.\s*", "", s.strip()) for s in f.get("Cách làm (theo source hiện tại)", "").split("\n") if s.strip()]
        if many and lines:
            lines[0] = f"[{c}] " + lines[0]
        out += lines
        if f.get("Gợi ý nếu khó"):
            out.append("Mẹo: " + f["Gợi ý nếu khó"])
    return out or ["Theo mô tả “Làm gì” ở trên."]


def xong(item):
    if "xong" in item:
        return item["xong"]
    many = len(item.get("tu", [])) > 1
    return " ".join((f"[{c}] " if many else "") + OLD[c]["fields"].get("Kết quả cần đạt", "") for c in item.get("tu", []))


# ---------------------------------------------------------------- nhóm: phân tích + nhiệm vụ
NHOM = [
    dict(id="FE", ten="Nhóm FE: thiết kế asset và dev giao diện lofi", nguoi="Thái, Trí Thành, Đức",
         nv1="Thiết kế mẫu và asset gần xong; hoàn thiện nốt đến tối 9/11 (cả ba cùng thiết kế asset và Figma cho các trang mình phụ trách, theo concept lofi của Góc học).",
         nv2="Từ tối 9/11 và 10/11: bắt tay dev, gắn asset, hoàn tất khung chung và đưa lên origin/test. Từ 11/11: dựng các trang, mỗi commit đưa lên origin/test; 28–30/11 kiểm so với Figma và tối ưu hiệu năng.",
         phan_tich=[
             "Chia lại theo yêu cầu: không còn nhóm Design và Asset riêng. Thái, Trí Thành, Đức đều làm cả asset lẫn code FE, mỗi người phụ trách trọn các trang của mình từ asset, Figma tới code để đẩy nhanh tiến độ.",
             "Phân công trang: Thái = trang bài học (lý thuyết, ví dụ, dự đoán, trắc nghiệm, tóm tắt) và diễn đàn. Đức = concept lofi ba khoá, trang khoá học, kệ sách Góc học, màn lắp khung mã và màn viết code, đăng nhập/đăng ký. Trí Thành = khung chung (điều hướng, token, bố cục), ôn tập hằng ngày, bộ câu hỏi đầu vào, học lại, đổi tên, nối giáo trình SQL/ML.",
             "Hiện trạng: Góc học (trang /) đã là phòng học lofi (code ở frontend/src/components/goc-hoc/); trang khoá học, bài học, ôn tập, IDE theo hệ thiết kế v2 kiểu khác. Nhánh test đã có T4 (phím Escape), T6 (CI), T7 (điều hướng render phía server, giảm ảnh tải đầu ~2,0 → ~1,5 MB) của Trí Thành: làm tiếp trên nền đó.",
             "Ràng buộc phải giữ: screen_keys() (Python) khớp buildScreens() (TS); không thêm style={{…}} (đang dọn 'unsafe-inline'); trang công khai dùng apiFetchSessionOnly chứ không apiFetch; đáp án đi qua visibleCorrectIndex(); luật design-system-v2 (không chuỗi ngày, không ổ khoá, chữ ≥ 15 px, vùng bấm ≥ 44 px).",
             "Không chờ nhóm khác: các màn cần API (ôn tập hằng ngày, questionnaire, học lại) làm bằng dữ liệu giả; script chép giáo trình do Trí Thành viết; Nam không cần chạy gì, Nhân chạy khi Nam nộp tài liệu.",
         ],
         nhan="API từ BE và ML; giáo trình đã nạp từ DB; nội dung từ Tài liệu.",
         giao="Giao diện chạy được từng trang để Nam đọc nội dung và nhóm kiểm tay."),
    dict(id="BE", ten="Nhóm BE (backend): kiểm tra, tối ưu, sửa lỗi", nguoi="Nghĩa (làm chính); Kiên: Arena (tự làm, tự báo cáo)",
         nv1="9–10/11: đo mốc và sửa lỗi 7 bài module 11 không hoàn thành được.",
         nv2="11–18/11: tối ưu các route nóng và luồng dữ liệu, diễn đàn, học lại, rà phụ thuộc; từ 19/11 Nghĩa chuyển hẳn sang ML.",
         phan_tich=[
             "Bối cảnh: BE hiện tại (nhánh origin/test) đã được Kiên làm xong phần lớn. Việc của Nghĩa là kiểm tra lại: đã tối ưu chưa, luồng dữ liệu có cách nào nhanh hơn không, còn lỗi nào cần sửa. Vì Nghĩa còn làm ML nên danh sách chỉ giữ những việc có bằng chứng từ code hoặc từ DB, và làm xong trước 18/11.",
             "Cách đánh giá (9/11): chạy trên nhánh test; số typecheck, test và lint theo bảng mốc nền trong AGENTS.md. Sau đó đọc các luồng nóng: hoàn thành bài, mở bài, ôn tập, danh sách khoá, ghi sự kiện học, diễn đàn, bảng xếp hạng, bộ nhớ đệm, giới hạn tần suất. Chưa đo thời gian chạy thật vì chưa có bộ đo route (task BE1).",
             "Kết luận chung: nền tảng rất chắc (chống farm XP, chống cộng XP hai lần khi bấm đúp, đáp án quiz không lộ, cổng đồng ý theo dõi ở server, SQL tham số hoá, guard toàn cục, bộ nhớ đệm có giới hạn). Có 1 lỗi thật về dữ liệu và 5 chỗ tối ưu nên làm, kèm 1 tính năng còn thiếu (học lại).",
             "Không cần làm, để Nghĩa khỏi mất thời gian: viết lại script nạp (đã có update-lesson-content.ts và seed-python-advanced-v4.ts trên test), viết lại bảo mật nền, dọn lint.",
             "Ghi nhận, không làm: luồng bài học lofi không cần API mới vì luồng hiện tại (tải bài → bản nháp màn ở trình duyệt → chấm bằng Pyodide → POST /lessons/:n/complete) đủ cho concept lofi; giới hạn tần suất và cache người dùng nằm trong bộ nhớ một tiến trình (chỉ đúng với 1 instance).",
         ],
         bang=[
             ["Chất lượng chung", "typecheck sạch; 522/522 ca đạt (35 bộ); lint theo AGENTS.md 92 lỗi, trần 100 (không đo lại)", "Tốt", "—"],
             ["Hoàn thành bài (POST /lessons/:n/complete)", "Chống farm XP bằng ghi danh + lessonNo + compare-and-set (lessons.service.ts dòng 308–503); thành tích ngoài transaction; nhưng 2 truy vấn nối đuôi trước transaction (dòng 329, 348) và 3–4 vòng cho user và nhật ký XP; nhật ký XP chưa có ràng buộc duy nhất (hiện 0 hàng trùng, nhưng ghi kiểu findFirst-rồi-ghi có thể trùng khi hai bài hoàn thành cùng lúc)", "Đúng nhưng chưa tối ưu", "BE3 (gồm cả ràng buộc nhật ký XP)"],
             ["Dữ liệu khoá python_advanced", "courses.lessons = 172, bảng lessons có 179 bài; completeLesson ném 400 cho bài 173–179", "LỖI", "BE2 (code) và DB1 (dữ liệu), làm độc lập"],
             ["Mở bài (GET …/content)", "2 truy vấn song song, đã đo 99 ms (comment dòng 190–207); nội dung 4,0 KB trung bình, tối đa 8,9 KB", "Tốt", "—"],
             ["Ôn tập (quiz)", "5 chỗ đọc content_json của mọi bài đã học (quizzes.service.ts dòng 206, 262, 458, 730, 760); getCourseQuizStatus chỉ để đếm", "Chưa tối ưu", "BE4"],
             ["Danh sách khoá của tôi (GET /enrolled)", "3 truy vấn nối đuôi, include cả hàng course (courses.service.ts dòng 143–181)", "Chưa tối ưu", "BE5"],
             ["Ghi sự kiện học (POST /events)", "2 vòng DB mỗi lô (tra consent rồi ghi); Heartbeat chiếm 52% số hàng; cổng đồng ý ở server đúng", "Đúng nhưng tốn vòng DB", "BE6"],
             ["Diễn đàn", "listPosts tải toàn bộ reactions mỗi bài; chỉ 8 ca test (mention.helper); bảng posts rỗng, chưa có giao diện", "Cần sửa trước khi có giao diện", "BE7"],
             ["Học lại khoá", "DELETE enroll giữ lesson_progress; chưa có đường học lại", "Thiếu tính năng", "BE8"],
             ["Bảo mật nền", "ValidationPipe whitelist + forbidNonWhitelisted, JwtAuthGuard, ThrottlerGuard toàn cục; SQL thô chỉ Prisma.sql; đồng ý theo dõi kiểm ở server", "Tốt", "BE9 (rà phụ thuộc)"],
             ["Bộ nhớ trong tiến trình", "CachedUserService TTL 60 giây, tối đa 10.000 mục; throttler cửa sổ cố định trong bộ nhớ", "Ổn với 1 instance", "Ghi nhận"],
         ],
         nhan="", giao=""),
    dict(id="DB", ten="Nhóm DB (cơ sở dữ liệu): đánh giá, tối ưu luồng dữ liệu, sửa lỗi", nguoi="Nhân",
         nv1="9–11/11: sửa lỗi dữ liệu courses.lessons, chốt DB cho nhánh test, bỏ chỉ mục GIN thừa.",
         nv2="11–30/11: chỉ mục, giữ dữ liệu có hạn, dọn khách, cột phục vụ cache và quy ước migration, đường nạp an toàn, an toàn dữ liệu, chịu tải, nghiệm thu.",
         phan_tich=[
             "Phạm vi: đọc source nhánh test (nơi ghi và đọc dữ liệu) và đo DB thật bằng truy vấn chỉ đọc ngày 9/11 (kết nối được, không ghi gì) để trả lời: cách lưu hiện tại ổn chưa, có cách nào tối ưu luồng dữ liệu không, còn lỗi nào.",
             "Kết luận: thiết kế khoá và quan hệ ổn (khoá chính ghép lesson_progress(user_id, lesson_id), unique (course_id, sort_order) cho bài, enrollments(user_id, course_id)); dữ liệu còn nhỏ (106 người dùng, 74 dòng tiến độ) nên chưa đau. Có 1 lỗi dữ liệu, 1 chỉ mục thừa nặng, 1 chỗ ghi có thể trùng, 3 nguồn phình dung lượng, và còn thiếu cấu trúc cho ML và học lại.",
             "Chống phình (số đo 9/11): lessons 5,47 MB trong đó chỉ mục GIN 3,6 MB chưa từng được dùng; learning_events 484 hàng, 241 byte mỗi hàng, Heartbeat chiếm 52%; 101/106 người dùng là khách (77 chưa học bài nào). Học lại, ôn tập, nhật ký sự kiện đều thêm dữ liệu theo từng người dùng nên cần quy định giữ dữ liệu từ bây giờ.",
             "Tiến độ không cần đăng nhập: khách nhận tài khoản tự động (POST /auth/guest), tiến độ gắn với users.id và phiên khách hiện đặt 8 giờ (JWT_REFRESH_EXPIRES); hết hạn là không đăng nhập lại được nên tiến độ thành dữ liệu mồ côi. Đề xuất (Q9): khách chưa có tiến độ quá 30 ngày thì xoá; khách có tiến độ giữ 180 ngày kể từ lần học cuối; người đăng nhập giữ không hạn. Học lại do người học bấm nút (không tự reset), XP không cộng lại, tiến độ cũ lưu vào bảng archive.",
             "Migration và khoá: DB dùng chung với bản Django nên chỉ được thêm (không đổi tên, không xoá cột, không đổi kiểu, không DROP bảng); bỏ chỉ mục GIN là ngoại lệ (chỉ bỏ chỉ mục, không mất dữ liệu) cần Nhân duyệt. Bảng mới dùng BIGINT/UUID, timestamptz, khoá ngoại có chỉ mục, CHECK cho giá trị hợp lệ. Prisma chạy cả file migration một lần nên không dùng CREATE INDEX CONCURRENTLY.",
             "Nối bài học và khoá: khoá → bài theo (course_id, sort_order) duy nhất và lesson_code ổn định; bảng course_modules (nếu cần) do việc questionnaire của ML tự tạo; thêm courses.content_version và lessons.content_hash để cache và nạp lại an toàn (DB7). Danh sách bài đang nằm ở 3 nơi (DB, curricula.json, gói nạp) nên cổng check-da-nap.mjs của main phải thêm phép so courses.lessons.",
             "An toàn: Prisma tham số hoá mọi truy vấn nên SQL injection rất khó; ứng dụng đang kết nối bằng chủ sở hữu neondb_owner nên cần role riêng chỉ có SELECT/INSERT/UPDATE/DELETE; hash mật khẩu theo định dạng Werkzeug, refresh token chỉ lưu hash; cần diễn tập khôi phục từ sao lưu.",
         ],
         bang=[
             ["Lỗi dữ liệu", "courses.lessons = 172 khác 179 bài của python_advanced; ba khoá db_design* khớp (20, 21, 25)", "LỖI", "DB1 (độc lập với BE2)"],
             ["Môi trường", "DB thật dùng chung; nhánh test có migration đến 20261116; khoá 179 bài", "Cần tách", "DB2"],
             ["Chỉ mục thừa", "lessons_content_json_idx (GIN) 3,6 MB, idx_scan = 0; cả bảng 5,47 MB trong khi nội dung chỉ 718 KB", "Thừa nặng", "DB3"],
             ["Chỉ mục khoá ngoại", "22 khoá ngoại chưa có chỉ mục; auth_sessions quét tuần tự 641 lần so với 11 lần dùng chỉ mục", "Chưa đau, nên làm", "DB4"],
             ["Tăng trưởng learning_events", "484 hàng trong 10 ngày, 241 B/hàng, Heartbeat 52%; 12 người đã đồng ý", "Nguồn phình lớn nhất", "DB5"],
             ["Khách rác", "101/106 người dùng là khách, 77 chưa học bài nào; 63/87 ghi danh có 0 bài hoàn thành", "Cần dọn theo chính sách", "DB6"],
             ["Cấu trúc cho ML và học lại", "Chưa có course_modules, question_bank, archive; lessons.module là chuỗi tự do", "Thiếu: mỗi việc tự tạo bảng của mình", "BE8, nhóm ML"],
             ["Cột cache và nạp an toàn", "Chưa có courses.content_version, lessons.content_hash; chưa có quy ước migration bằng văn bản", "Thiếu", "DB7"],
             ["Nạp giáo trình", "SQL và ML chưa nạp; danh sách bài ở 3 nơi cần khớp nhau", "Cần quy trình", "DB8"],
             ["An toàn", "Prisma tham số hoá; ứng dụng dùng neondb_owner; chưa diễn tập khôi phục", "Cần role riêng", "DB9"],
             ["Chịu tải", "Chưa đo với dữ liệu lớn", "Chưa biết", "DB10"],
         ],
         nhan="", giao=""),
    dict(id="ML", ten="Nhóm ML", nguoi="Nghĩa (Nam Nguyễn soạn câu hỏi và duyệt đề)",
         nv1="9–12/11 (song song với BE): đặc tả questionnaire và cách xếp module; thiết kế pipeline sinh đề và cách đánh giá.",
         nv2="16–30/11 (sau khi xong BE ngày 18/11): sinh trắc nghiệm và bài tập code, dựng questionnaire và API ôn tập hằng ngày, hiệu chỉnh tham số, đánh giá chất lượng.",
         phan_tich=[
             "Xếp module: hiện có POST /user/survey (lưu khảo sát, sinh lộ trình mẫu) và bảng questionnaires chưa có mã nào đọc; khách bỏ qua bảng hỏi; frontend chưa có màn nào. Mục tiêu: người đã đăng nhập làm bộ câu hỏi và được xếp đúng module bắt đầu (khoá 11 module thì người A bỏ qua 3 module đầu, người B học từ đầu). ML tự tạo bảng course_modules và 20 câu mẫu từ step_2.mcq; câu xếp level do Nam soạn (nếu đã có file) nạp thêm bằng cùng lệnh, không ai phải chờ.",
             "Sinh đề: nguồn là lý thuyết trong lessons.content_json (step_1.theory, explain, code); định dạng đích có sẵn (MCQ: question, options[text, detail, correct], explanation; bài code: task, starterCode, solutionCode, tests[name, call, expect], hints). Đã có tích hợp Gemini trong lesson-import.service.ts (parseWithGemini) để làm mẫu. Bài code phải được kiểm chứng bằng bộ chấm Pyodide: lời giải qua mọi ca, khung trống phải trượt. Nguồn là các gói bài đã có trong repo (scripts/pe-da/out/lessons/*.json), nên không chờ tài liệu mới.",
             "“Fine-tune”: dữ liệu hiện có (hàng trăm câu MCQ, 130–179 bài tập code đã chấm, vài chục người dùng thật) chưa đủ để fine-tune thật. Tháng 11 hiệu chỉnh prompt, ví dụ mẫu, tham số, ngưỡng và đo chất lượng bằng bộ 20 người học mẫu; thu bộ dữ liệu đã duyệt để fine-tune thật khi đủ mẫu.",
             "Bẫy cần nhớ: kho quiz chỉ đọc khoá text/label của lựa chọn (normalizeQuestion), đề sinh ra phải đúng định dạng; đáp án không được lộ trước khi nộp (stripAnswers). Main đã có ôn giãn cách trong quizzes.service.ts: API ôn tập hằng ngày phải gộp với nó chứ không viết song song.",
         ],
         nhan="Mã module và bảng question_bank từ DB; câu xếp level, nhãn khái niệm, duyệt đề từ Tài liệu; Figma từ FE.",
         giao="API questionnaire và ôn tập hằng ngày cho FE; báo cáo đánh giá chất lượng."),
    dict(id="Tài liệu", ten="Nhóm Tài liệu (giáo trình) và review", nguoi="Nam Nguyễn; review: Nhân, Kiên",
         nv1="7–15/11: hoàn thiện Database (SQL) nâng cấp từ khoảng 70% lên 100%; ML đạt 50%.",
         nv2="16–30/11: ML 100% (chậm nhất Thứ Tư 18/11), câu xếp level, nhãn module, duyệt đề do máy sinh, kiểm nội dung trên nền tảng.",
         phan_tich=[
             "Hiện trạng: Python xong; Database cơ bản xong, Database nâng cao đang khoảng 70% cho toàn bộ môn; ML đang bắt đầu.",
             "Hạn mới (đẩy nhanh): chậm nhất cuối tuần sau (Chủ nhật 15/11) xong Database 100% và ML 50%; chậm nhất Thứ Tư 18/11 hoàn thiện ML 100%. Tôi hiểu “t4 tuần sau nữa” là Thứ Tư 18/11; nếu hạn khác thì báo để sửa.",
             "Ràng buộc: ví dụ code chạy được trong trình duyệt (chỉ có numpy, pandas, matplotlib, sqlite3 và thư viện chuẩn); môn ML cần kiểm ngay xem có cần thư viện ngoài gói không. Mỗi bài theo cấu trúc step_1 … step_4 (LESSON-IMPORT-FORMAT.md, mẫu scripts/pe-v4/out-advanced/lessons/001-P01.json).",
             "Review theo mốc ngày: Nhân xem khung và thứ tự bài, Kiên xem ví dụ code chạy ra đúng kết quả, theo checklist 6 mục (mục tiêu một câu, thuật ngữ giải thích lần đầu, ví dụ chạy được, thứ tự hợp lý, bài tập có đáp án và giải thích, người mới đọc không phải hỏi lại). Người review đóng việc khi có file nhận xét; Nam tự kiểm bằng cùng checklist nên không chờ review.",
             "Vai trò mở rộng: nhãn module, khái niệm, mức, bài tiên quyết lưu ở data/lesson-labels.json để ai cần thì đọc (ML đã tự lấy mã module từ lessons.module nên không chờ file này).",
         ],
         nhan="Đặc tả questionnaire từ ML; giáo trình đã nạp từ DB để kiểm trên nền tảng.",
         giao="Tài liệu đã review cho DB và FE; câu xếp level, nhãn module, đề đã duyệt cho ML."),
]

MOC = [
    ("Tuần này", "9 – 15/11", "Chủ nhật 15/11",
     "FE: hoàn thiện nốt thiết kế và asset tối 9/11; 10/11 asset đã gắn và đã nằm trên origin/test; trang khoá học xong 15/11. BE: mốc đo và sửa lỗi code 7 bài module 11 (10/11), tối ưu hoàn thành bài kèm ràng buộc nhật ký XP và ôn tập (13/11), /enrolled (14/11), ghi sự kiện (15/11). DB: sửa courses.lessons (10/11), chốt DB cho nhánh test và bỏ chỉ mục GIN (11/11), chỉ mục khoá ngoại (12/11), bắt đầu giữ dữ liệu events và dọn khách. Tài liệu: Database 100% và ML 50% (15/11). ML: đặc tả questionnaire (11/11), pipeline sinh đề (12/11)."),
    ("Tuần 2", "16 – 22/11", "Chủ nhật 22/11",
     "BE: diễn đàn (17/11), học lại (17/11), báo cáo BE (18/11) rồi Nghĩa chuyển hẳn sang ML. FE: trang bài học (19/11), script chép giáo trình (17/11), màn lắp khung mã và viết code (22/11). DB: cột cache và quy ước migration (17/11), đường nạp an toàn (17/11), an toàn dữ liệu (20/11), chịu tải (22/11). ML: sinh trắc nghiệm (19/11), bắt đầu sinh bài code. Tài liệu: ML 100% (18/11), câu xếp level (19/11), nhãn module (23/11)."),
    ("Tuần 3", "23 – 29/11", "Chủ nhật 29/11",
     "FE: đăng nhập (26/11), diễn đàn (27/11), bộ câu hỏi đầu vào, học lại, đổi tên (28/11). ML: sinh bài code (23/11), questionnaire (25/11), API ôn tập (28/11), hiệu chỉnh tham số (28/11). Tài liệu: duyệt mẫu đề (27/11). DB: giữ dữ liệu và dọn khách đã chạy."),
    ("Chốt", "30/11", "Thứ Hai 30/11",
     "FE: kiểm so Figma và tối ưu hiệu năng. Tài liệu: kiểm nội dung xong. ML: báo cáo đánh giá sinh đề. DB: nghiệm thu. Kiên báo cáo tiến độ Arena. Từ 1/12 là giai đoạn nâng cấp tiếp theo (gồm fine-tune thật khi đủ dữ liệu đã duyệt)."),
]

QUYET_DINH = [
    ("Q8", "Nhánh test chạy trên DB nào?",
     "DB thật dùng chung (179 bài Data Analyst); nhánh test có migration đến 20261116.",
     "Mỗi người tự tạo branch Neon riêng cho việc của mình; Nhân tạo branch cho nhánh test (DB2). Không ai ghi lên DB thật trừ Nhân (DB1, DB3).", "Nhân"),
    ("Q9", "Tiến độ khách giữ bao lâu và học lại do ai quyết?",
     "Hạn phiên mặc định 8 giờ (JWT_REFRESH_EXPIRES); chưa có chính sách học lại.",
     "Áp dụng ngay: khách chưa có tiến độ quá 30 ngày thì xoá; khách có tiến độ giữ 180 ngày kể từ lần học cuối; người đăng nhập giữ không hạn; học lại do người học bấm nút, XP không cộng lại. Các con số là tham số cấu hình nên đổi được sau, không ai chờ.", "Nhân (dọn khách), Nghĩa (học lại)"),
    ("Q10", "“Fine-tune” model ML làm thế nào khi dữ liệu còn ít?",
     "Mới có vài chục người dùng thật; fine-tune thật cần hàng nghìn mẫu đã duyệt.",
     "Áp dụng ngay: tháng 11 hiệu chỉnh prompt, ví dụ mẫu, tham số, ngưỡng và đo chất lượng; thu bộ dữ liệu đã duyệt để fine-tune thật khi đủ mẫu.", "Nghĩa"),
    ("Q11", "Bỏ chỉ mục GIN lessons_content_json_idx và sửa courses.lessons trên DB thật",
     "Ghi trên DB thật; bỏ chỉ mục GIN là ngoại lệ của luật “migration chỉ thêm” nhưng chỉ bỏ chỉ mục, không mất dữ liệu.",
     "Làm cả hai, sao lưu trước, ghi thời điểm và lý do.", "Nhân (chủ DB)"),
]

NGUYEN_TAC = [
    "Không việc nào chờ việc khác. Mỗi việc chỉ dùng thứ đã có sẵn trong repo/DB hôm nay, hoặc thứ do chính người làm việc đó tạo ra (bảng, migration, dữ liệu mẫu, dữ liệu giả).",
    "Chỗ hai việc cùng chạm một API/bảng/file thì bên dùng làm trước bằng dữ liệu giả đúng hình dạng (ghi trong “Gợi ý làm” của việc đó); khi bên kia xong thì chỉ thay nguồn dữ liệu.",
    "“Xong khi” của mỗi việc chỉ đo bằng thứ người làm tự kiểm được (test, số đo, file có mặt), không cần việc của người khác. Review và duyệt đều theo mốc ngày: người review đóng việc khi có file nhận xét, người được review không chờ.",
    "Quyết định đã có mặc định áp dụng ngay (mục Quyết định); đổi quyết định chỉ là đổi tham số, không ai phải dừng.",
]

HOP_DONG = [
    ("C1", "Học lại khoá",
     "POST /api/courses/:id/reset (cần JWT), body { confirm: true } bắt buộc. 200: { ok: true, archived: <số dòng tiến độ đã lưu>, completedLessons: 0, progress: 0 }. Lỗi: 403 chưa ghi danh khoá; 404 không có khoá; 400 thiếu confirm.",
     "Cấp: Nghĩa (BE8, tự tạo bảng lesson_progress_archive và cột enrollments.reset_at). Dùng: Trí Thành (màn học lại) bằng dữ liệu giả frontend/src/lib/mock/reset-response.json."),
    ("C2", "Bộ câu hỏi đầu vào (questionnaire)",
     "GET /api/questionnaire → 200 { ok: true, version: number, questions: [{ id: string, type: 'self_report' | 'placement', course: string, module_code: string | null, level_tag: 'beginner' | 'intermediate' | 'advanced', text: string, options: [{ key: string, text: string }] }] } (KHÔNG có đáp án đúng). POST /api/user/survey: body cũ vẫn hợp lệ, thêm answers?: [{ id: string, key: string }] → 200 { ok: true, result: { byCourse: { [courseId]: { level, start_module: string, confidence: number } } } }. File câu hỏi của Nam: data/questionnaire/<môn>.json = mảng questions, mỗi câu thêm correct_key và explanation.",
     "Cấp: Nghĩa (ML: dựng questionnaire, tự tạo 20 câu mẫu và nạp file của Nam khi có). Dùng: Trí Thành (màn questionnaire) bằng dữ liệu giả frontend/src/lib/mock/questionnaire.json; Nam chỉ cần đặt file đúng định dạng."),
    ("C3", "Ôn tập hằng ngày",
     "GET /api/practice/daily?n=10 → 200 { ok: true, quiz_id: number, questions: [{ index: number, kind: 'mcq' | 'code', lesson_code: string, module_code: string | null, question?: string, options?: [{ key: string, text: string }], task?: string, starter_code?: string, tests?: [{ name: string, call: string, expect: string }] }] } (mcq không có đáp án đúng). POST /api/practice/daily/:quiz_id/submit, body { answers: [{ index, key }], code_results: [{ index, passed }] } → 200 { ok: true, score, total, review: [{ index, correct, correct_key?, explanation? }] }; nộp lần hai trả 409.",
     "Cấp: Nghĩa (ML: API ôn tập hằng ngày, tự tạo bảng question_bank và question_seen). Dùng: Trí Thành (màn ôn tập) bằng dữ liệu giả frontend/src/lib/mock/practice-daily.json."),
    ("C4", "Hạn phiên trả cho FE",
     "POST /auth/refresh: body trả thêm expires_at (ISO 8601, lúc phiên hết hạn). FE đọc nếu có; không có thì dùng mặc định: khách 30 ngày, tài khoản thật 8 giờ.",
     "Cấp: Nghĩa (nếu BE chưa trả trường này thì thêm trong BE tối ưu, không chặn ai). Dùng: Trí Thành (bỏ ghi cứng 28800), làm đúng cả khi có và khi không có trường."),
    ("C5", "Chép giáo trình vào giao diện",
     "Danh sách bài của mọi môn nằm ở frontend/src/lib/curricula.json (và LESSON_META), do sync_curricula.py (tham số --bundle --course) chép từ gói bài.",
     "Cấp: Trí Thành (script dùng được cho mọi môn, 16–17/11). Dùng: Nhân chạy script cho SQL và ML khi Nam nộp tài liệu."),
    ("C6", "Quy ước migration",
     "Mỗi người tự tạo migration cho bảng của MÌNH (tên YYYYMMDDHHMMSS_<việc>) và chạy trên branch Neon riêng của mình. Chỉ thêm; bảng mới dùng BIGINT/UUID, timestamptz, khoá ngoại có chỉ mục, CHECK; không đổi tên, không xoá cột, không đổi kiểu, không DROP bảng.",
     "Nhân viết quy ước vào AGENTS.md (DB7) và chỉ rà sau, không phải cửa chặn."),
    ("C7", "Nhánh và PR",
     "Mọi việc (FE, BE, DB, ML, Tài liệu) chỉ tồn tại trên nhánh origin/test: cắt nhánh con từ test (be/<việc>, db/<việc>) và mở PR vào test. Không việc nào lấy, gộp hay phụ thuộc code của main.",
     "Việc gộp hai nhánh là việc riêng của Nhân (DB2), không chặn việc nào."),
]

CAT = [
    "Mọi việc phải xong trước 30/11. BE xong trước 18/11 để Nghĩa tập trung ML. Việc nào trễ chỉ ảnh hưởng chính việc đó vì các việc đã độc lập; báo ở mốc Chủ nhật hằng tuần.",
    "Thứ tự ưu tiên của BE nếu thiếu thời gian: BE2 (lỗi dữ liệu) > BE4 (ôn tập) > BE3 (hoàn thành bài) > BE5 (/enrolled) > BE6 (sự kiện) > BE7 (diễn đàn) > BE8 (học lại) > BE9. BE1 (đo mốc) làm gọn để có số trước/sau.",
    "Tài liệu: hạn 15/11 (Database 100%, ML 50%) và 18/11 (ML 100%) là hạn của chính Nam; các nhóm khác đã làm bằng dữ liệu của mình nên không bị ảnh hưởng nếu trễ.",
]

# ---------------------------------------------------------------- PDF
pdfmetrics.registerFont(TTFont("Arial", "C:/Windows/Fonts/arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", "C:/Windows/Fonts/arialbd.ttf"))
pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial", boldItalic="Arial-Bold")
GREY = colors.Color(0.953, 0.957, 0.965)
LINE = colors.Color(0.82, 0.84, 0.87)
MUTE = colors.Color(0.42, 0.447, 0.502)
INK = colors.Color(0.09, 0.1, 0.12)
ACC = colors.Color(0.93, 0.95, 1.0)


def st(name, size=9, lead=None, bold=False, color=INK, after=3, before=0, left=0):
    return ParagraphStyle(name, fontName="Arial-Bold" if bold else "Arial", fontSize=size, leading=lead or size * 1.35,
                          textColor=color, spaceAfter=after, spaceBefore=before, leftIndent=left, alignment=TA_LEFT)


S = dict(
    title=st("t", 24, 28, True, after=2), sub=st("s", 12, 16, color=MUTE, after=8), h1=st("h1", 16, 20, True, after=5, before=10),
    h2=st("h2", 10.5, 14, True, after=3, before=6), body=st("b", 9.5, 13),
    cell=st("c", 8.5, 11.5, after=0), cellb=st("cb", 8.5, 11.5, True, after=0), head=st("hd", 9, 12, True, after=0),
    bul=st("bu", 9.5, 13, left=10, after=2),
)


def P(t, k="body"):
    return Paragraph(t, S[k])


def esc(t):
    return str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def tbl(rows, widths, head=True, pad=4):
    data = [[Paragraph(esc(c), S["head" if (head and i == 0) else "cell"]) for c in r] for i, r in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1 if head else 0)
    cmds = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE), ("TOPPADDING", (0, 0), (-1, -1), pad),
            ("BOTTOMPADDING", (0, 0), (-1, -1), pad), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5)]
    if head:
        cmds.append(("BACKGROUND", (0, 0), (-1, 0), GREY))
    t.setStyle(TableStyle(cmds))
    return t


def bullets(items):
    return "<br/>".join("• " + esc(x) for x in items)


def numbered(items):
    n, out = 0, []
    for x in items:
        if x.startswith("Mẹo:"):
            out.append(esc(x))
        else:
            n += 1
            out.append(f"{n}. {esc(x)}")
    return "<br/>".join(out)


def card(item, label=None):
    head = Paragraph((f"<b>[{label}]</b> " if label else "") + f"<b>{esc(item['ten'])}</b>", S["cellb"])
    who = esc(item["ai"]) + (f"<br/>Có thể hỏi (không bắt buộc): {esc(item["ho_tro"])}" if item.get("ho_tro") else "")
    meta = Paragraph(f"<b>{who}</b><br/>{esc(item['ngay'])}", S["cell"])
    rows = [[head, meta],
            [Paragraph("<b>Làm gì</b><br/>" + bullets(item["lam"]), S["cell"]), ""],
            [Paragraph("<b>Gợi ý làm (theo source hiện tại)</b><br/>" + numbered(goi_y(item)), S["cell"]), ""],
            [Paragraph("<b>Xong khi</b>&nbsp;&nbsp;" + esc(xong(item)), S["cell"]), ""],
            [Paragraph("<b>Tình trạng (điền ở buổi kiểm Chủ nhật)</b>&nbsp;&nbsp;[&nbsp;&nbsp;] Chưa làm&nbsp;&nbsp;&nbsp;[&nbsp;&nbsp;] Đang làm&nbsp;&nbsp;&nbsp;[&nbsp;&nbsp;] Xong&nbsp;&nbsp;&nbsp;Ghi chú: ____________________", S["cell"]), ""]]
    tb = Table(rows, colWidths=[370, 123])
    cmds = [("BACKGROUND", (0, 0), (-1, 0), GREY), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
            ("BOX", (0, 0), (-1, -1), 0.5, LINE), ("TOPPADDING", (0, 0), (-1, -1), 3.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6), ("BACKGROUND", (0, 4), (-1, 4), ACC)]
    for i in range(1, len(rows)):
        cmds.append(("SPAN", (0, i), (1, i)))
    tb.setStyle(TableStyle(cmds))
    return [tb, Spacer(1, 8)]


def footer(c, d):
    c.saveState()
    c.setFont("Arial", 8)
    c.setFillColor(MUTE)
    c.drawString(51, 28, "Programming EDU (PE) — Phân việc nhóm · lịch 9/11 – 30/11/2026 · lập 9/11")
    c.drawRightString(A4[0] - 51, 28, f"Trang {d.page}")
    c.restoreState()


def build_pdf():
    doc = SimpleDocTemplate(str(ROOT / "PHAN-VIEC-NHOM.pdf"), pagesize=A4, leftMargin=51, rightMargin=51, topMargin=51, bottomMargin=48,
                            title="Phân việc nhóm — Programming EDU (PE)", author="Nhóm PE")
    items = DATA["items"]
    theo = {n["id"]: sorted([i for i in items if i["nhom"] == n["id"]], key=lambda i: i["bd"]) for n in NHOM}
    f = [P("Phân việc nhóm", "title"), P("Nền tảng học lập trình Programming EDU (PE) — USTH", "sub")]
    f += [P(f"Ngày lập {NGAY_LAP}. <b>Xong toàn bộ tài liệu, thiết kế và dev trước hết tháng 11/2026.</b> Mỗi tuần một mốc kiểm vào Chủ nhật (8/11, 15/11, 22/11, 29/11) và nghiệm thu 30/11. "
            "Bản 9/11: viết lại sau khi kiểm tra trên nhánh test và đo DB thật bằng truy vấn chỉ đọc. "
            "Số liệu DB đo ngày 9/11 (không ghi gì).", "body"), Spacer(1, 5)]
    f += [P("1. Cách đọc", "h1")]
    for x in [
        "<b>Nguyên tắc: không việc nào chờ việc khác</b> (mục 5 và 6 nói cách làm). Việc chia theo <b>5 nhóm</b>: FE (Thái, Trí Thành, Đức cùng làm asset và code), BE (Nghĩa: kiểm tra, tối ưu, sửa lỗi), DB (Nhân: đánh giá, tối ưu, sửa lỗi), ML (Nghĩa), Tài liệu (Nam; review Nhân, Kiên). Mỗi nhóm có phần phân tích (hiện trạng, vấn đề, hướng làm), phần nhận/giao với nhóm khác, rồi đầu việc.",
        "Hai nhịp: <b>nhiệm vụ 1</b> thiết kế mẫu và asset (gần xong, hoàn thiện nốt tối 9/11); <b>nhiệm vụ 2</b> dev từ tối 9/11 (gắn asset và khung chung, đưa lên origin/test; từ 11/11 dựng trang). BE và DB: việc nào cũng gắn với bằng chứng đọc từ code hoặc đo từ DB; BE xong trước 18/11 để Nghĩa tập trung ML.",
        "Mỗi đầu việc có “Làm gì”, “Gợi ý làm” (file và hàm có thật trong repo), “Xong khi” và ô tình trạng.",
        "<b>Arena</b>: Kiên tự lên ý tưởng, dev và tự báo cáo tiến độ ở repo/nhánh khác; nếu cần thì cả nhóm vào làm cùng.",
    ]:
        f.append(P("• " + x, "bul"))

    f += [P("2. Đã làm (theo repo)", "h1"),
          tbl([["Ai", "Việc", "Bằng chứng"]] + [[d["nguoi"], d["viec"], d["bang_chung"]] for d in DATA["da_lam"]], [60, 333, 100], pad=3)]

    f += [P("3. Năm nhóm và nhiệm vụ", "h1")]
    rows = [["Nhóm", "Ai", "Nhiệm vụ 1", "Nhiệm vụ 2"]]
    for n in NHOM:
        rows.append([n["ten"], n["nguoi"], n["nv1"], n["nv2"]])
    f += [tbl(rows, [80, 70, 171, 172], pad=3)]

    f += [P("4. Mốc kiểm theo tuần", "h1"),
          P("Mỗi tuần đúng một mốc, kiểm vào Chủ nhật (họp 30 phút: từng mục đạt hay không, mục nào lùi thì ghi lý do và ai nhận). Mốc không đạt thì xử lý ngay hôm sau, không dồn sang tuần sau.", "body"), Spacer(1, 3),
          tbl([["Tuần", "Ngày", "Kiểm vào", "Phải xong"]] + [list(m) for m in MOC], [38, 48, 62, 345])]

    f += [P("5. Nguyên tắc không chờ nhau", "h1")]
    f += [P("• " + esc(x), "bul") for x in NGUYEN_TAC]
    f += [P("Quyết định đã đặt mặc định (áp dụng ngay, đổi được sau, không chặn ai)", "h2"),
          tbl([["Mã", "Câu hỏi", "Vì sao", "Mặc định áp dụng ngay", "Ai quyết"]] + [list(q) for q in QUYET_DINH], [26, 92, 120, 190, 65])]

    for n, nh in enumerate(NHOM):
        f += [PageBreak(), P(f"{6 + n}. {nh['ten']}", "h1"), P("<b>Thành viên:</b> " + esc(nh["nguoi"]), "body"), P("Phân tích", "h2")]
        f += [P("• " + esc(x), "bul") for x in nh["phan_tich"]]
        f += [Spacer(1, 4)]
        if nh.get("bang"):
            f.append(P("Đánh giá từ đọc source và số đo", "h2"))
            f.append(tbl([["Mục", "Hiện trạng và bằng chứng", "Kết luận", "Việc"]] + nh["bang"], [88, 255, 80, 70], pad=3))
            f.append(Spacer(1, 4))
        mine = theo[nh["id"]]
        nhan_nhom = {}
        if nh["id"] in ("BE", "DB"):
            k = 0
            for it in mine:
                if nh["id"] == "BE" and it["ai"] == "Kiên":
                    continue
                k += 1
                nhan_nhom[it["ten"]] = f"{nh['id']}{k}"
        for label, lst in (("Nhiệm vụ 1 (đến hết Chủ nhật 8/11)", [i for i in mine if i["bd"] < NV1_END]), ("Nhiệm vụ 2 (từ 9/11)", [i for i in mine if i["bd"] >= NV1_END])):
            if not lst:
                continue
            f.append(P(f"Đầu việc — {label}", "h2"))
            for it in lst:
                f.extend(card(it, nhan_nhom.get(it["ten"])))

    f += [PageBreak(), P("Lịch từng người theo ngày", "h1"), P("Sắp theo ngày bắt đầu.", "body"), Spacer(1, 3)]
    for p in NGUOI:
        rows = [["Ngày", "Nhóm", "Việc"]]
        mine = [(i["bd"], i["nhom"], i["ten"]) for i in items if p in ai_list(i)]
        days = {i["ten"]: i["ngay"] for i in items}
        for bd, nhom, ten in sorted(mine, key=lambda x: x[0]):
            rows.append([days[ten.replace("(hỗ trợ) ", "")], nhom, ten])
        f += [P(f"{p} ({VAI_NGUOI[p]})", "h2"), tbl(rows, [110, 45, 338], pad=3), Spacer(1, 4)]

    f += [P("Nếu trễ", "h1")]
    f += [P("• " + esc(x), "bul") for x in CAT]
    doc.build(f, onFirstPage=footer, onLaterPages=footer)


if __name__ == "__main__":
    build_pdf()
    print("đã dựng PHAN-VIEC-NHOM.pdf:", len(NHOM), "nhóm,", len(DATA["items"]), "việc")
