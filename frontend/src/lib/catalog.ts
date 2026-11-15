/**
 * Danh mục khóa học tĩnh — nguồn duy nhất cho trang chủ và trang chi tiết.
 *
 * Vì sao tĩnh: mọi route `/api/courses*` của backend đều đòi JWT, mà giao diện
 * đăng nhập đã bị gỡ khỏi frontend. Đọc danh mục từ API thì khách nào cũng nhận
 * 401 và trang chủ trống trơn. Nội dung dưới đây chép từ seed (id, tiêu đề, phụ
 * đề, cấp độ, thời lượng) và số bài lấy thẳng từ `curricula.json` — cùng nguồn
 * trang chi tiết đang dùng để vẽ giáo trình, nên hai chỗ không thể lệch số bài.
 *
 * Seed nào là nguồn: `prisma/seed-courses.js` KHÔNG tạo `python_advanced`. Tiêu
 * đề khoá này nằm ở `scripts/seed-python-da.ts` (`TITLE` + `META`:
 * subtitle/description ghi vào `courses.content_meta`). Sửa tên khoá là phải sửa
 * cả hai chỗ, không thì lần seed sau kéo tên cũ trở lại. (`scripts/seed-python-
 * advanced-v4.ts` và `scripts/rename-python-advanced.ts` vẫn mang tên cũ
 * "Advanced Python" — chúng là công cụ của bộ 48 bài pe-v4 đã nghỉ, đừng chạy.)
 *
 * Khoá `python` cơ bản đã gỡ khỏi trang (10/2026): chỉ còn một khoá Python.
 * 24/10/2026 khoá này đổi ruột: 48 bài pe-v4 ra, 172 bài "Python cho Data
 * Analyst" từ scripts/pe-da vào (đồng bộ bằng scripts/pe-da/sync_curricula.py).
 *
 * 13/10/2026 — gỡ nốt 6 khoá còn lại khỏi danh mục (cpp, java, htmlcss,
 * db_design, db_design_tc, db_design_nc). Buổi dùng thử với giảng viên và sinh
 * viên chỉ xoay quanh Python Advanced; một thẻ dẫn vào khoá rỗng hoặc dựng nửa
 * vời làm người thử mất lòng tin vào cả buổi. Đây là thay đổi TRÌNH BÀY: bản ghi
 * khoá trong DB và `prisma/seed-courses.js` không bị sửa, các route tự có của
 * chúng (`/courses/db_design*`, `/lesson/java`, `/lesson/htmlcss`, `/interface`)
 * vẫn chạy khi mở bằng đường dẫn trực tiếp — chỉ không còn lối vào từ trang chủ,
 * và `/courses/{cpp,java,htmlcss}` (route động, `dynamicParams = false`) thành 404.
 *
 * Sửa seed thì phải sửa cả file này (xem bẫy "hai nguồn danh sách bài" trong
 * AGENTS.md — đây là nguồn thứ ba của cùng một loại lệch).
 */
import type { GlyphKind } from '@/components/CourseGlyph';
import CURRICULA_JSON from '@/lib/curricula.json';

type Curriculum = { modules?: { title: string; lessons: string[] }[] };
const CURRICULA = CURRICULA_JSON.CURRICULA as Record<string, Curriculum>;

export type Level = 'beginner' | 'intermediate' | 'advanced';

export type CatalogCourse = {
  id: string;
  /** Nhãn ngắn dưới biểu tượng ở trang chủ. */
  label: string;
  title: string;
  subtitle: string;
  description: string;
  /**
   * Nhãn ngắn in hoa trên tiêu đề ở trang chi tiết, ghép với cấp độ thành
   * "THẺ · NÂNG CAO". KHÔNG bắt buộc: khoá nào không khai thẻ thì CourseDetail
   * bỏ HẲN dòng nhãn (13/10/2026 — bỏ nhãn "MINI-GAME · NÂNG CAO" của
   * python_advanced; để lại mỗi "NÂNG CAO" là còn trơ nửa dòng, nên cả dòng đi).
   */
  tag?: string;
  level: Level;
  duration: string;
  lessons: number;
  rating: number;
  /** Ảnh bìa ở hero trang chi tiết (đường dẫn trong /public). */
  image: string;
  /** Hai màu thương hiệu của khóa — vẽ biểu tượng ở trang chủ. */
  color: string;
  accent: string;
  /** 1–3 ký tự in trên biểu tượng. */
  mark: string;
  /** Hình biểu tượng riêng (xem CourseGlyph); bỏ trống thì dùng hình mặc định. */
  icon?: GlyphKind;
  /** Trang bài học của khóa. */
  lessonUrl: string;
};

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};

/** Số bài = tổng bài của mọi module trong giáo trình; khóa không có giáo trình dùng `fallback`. */
function lessonCount(id: string, fallback: number): number {
  const modules = CURRICULA[id]?.modules;
  if (!modules?.length) return fallback;
  return modules.reduce((sum, m) => sum + m.lessons.length, 0);
}

export const COURSES: CatalogCourse[] = [
  {
    id: 'python_advanced',
    // Tên đổi 24/10/2026 cùng lúc đổi ruột khoá. "Advanced Python" nói sai với
    // người chưa biết Python: bài đầu (PY01) bắt đầu từ `print(12 + 9)` và 54
    // trong 172 bài ở mức "Cơ bản" — họ sẽ bỏ qua đúng khoá dành cho mình.
    // Phải TRÙNG `TITLE` trong scripts/seed-python-da.ts (hai nguồn của cùng
    // một cái tên; `e2e/unit/catalog-naming.test.mjs` canh chỗ này).
    label: 'Python cho Data Analyst',
    title: 'Python cho Data Analyst',
    subtitle: '179 bài: từ phép cộng đầu tiên tới phân tích dữ liệu',
    description:
      'Học bằng cách đọc lời giảng, đọc code kèm kết quả thật rồi tự chạy lại và sửa. Python nền '
      + 'tảng, NumPy, pandas, trực quan hoá (Matplotlib, seaborn, Plotly), OOP và sqlite3, tiến '
      + 'trình và đa luồng, Tkinter — phần lớn bài chạy ngay trong trình duyệt, những bài cần thư '
      + 'viện không có sẵn thì có hướng dẫn chạy trên máy.',
    // KHÔNG ghi số bài chạy-trong-trình-duyệt vào phần giới thiệu: tỉ lệ đó đổi
    // theo từng lần dựng lại pe-da — chiều 24/10/2026 nó đi 133 → 130 → 128
    // trong vòng một giờ. Con số chính xác nằm ở phần "Yêu cầu" của
    // `curricula.json`, do scripts/pe-da/sync_curricula.py sinh lại mỗi lần
    // dựng, nên nó không trôi khỏi dữ liệu.
    // Không khai `tag`: xem chú thích ở CatalogCourse.tag.
    //
    // `beginner` chứ không phải `advanced`: nhãn cấp độ ở trang chủ nói về NGƯỠNG
    // VÀO, mà khoá này không cần biết Python trước. Khoá vẫn đi tới đa luồng,
    // multiprocessing và Tkinter ở cuối — phần đó nằm trong giáo trình, không
    // phải trong nhãn.
    level: 'beginner',
    // Tổng `estimated_minutes` của 172 bài là 2 360 phút = 39,2 giờ (cộng từ
    // scripts/pe-da/out/lessons/*.json). Đừng ghi theo kiểu "172 bài × 1 giờ":
    // đúng cái đó từng cho ra "~48 giờ" cho bộ 48 bài trong khi thật là 28,8 —
    // phóng đại ~67% trên trang ai cũng vào. `e2e/unit/catalog-duration.test.mjs`
    // cộng lại từ giáo trình thật và đòi chuỗi này khớp.
    //
    // 1 836 -> 2 360 phút ngày 27/10: thêm 3 câu trắc nghiệm mỗi bài (516 câu),
    // tính 1 phút/câu. Thêm màn vào bài mà vẫn báo số phút cũ thì con số này
    // nói sai, và nó là con số người học dùng để quyết định có bắt đầu hay không.
    //
    // 2 378 -> 2 441 phút ngày 30/10: thêm module 11 (7 bài thực hành trên bộ
    // dữ liệu CC0 thật). 40,7 giờ, nên chuỗi là "~41 giờ" — ca test cho lệch
    // tối đa 1 giờ, giữ "~39" là TRƯỢT chứ không phải làm tròn rộng tay.
    duration: '~41 giờ',
    lessons: lessonCount('python_advanced', 179),
    rating: 4.8,
    image: '/static/images/python.webp',
    color: '#2563eb',
    accent: '#e5334b',
    mark: 'Py+',
    icon: 'python',
    lessonUrl: '/lesson/python_advanced',
  },
];

export function findCourse(id: string): CatalogCourse | undefined {
  return COURSES.find((c) => c.id === id);
}

/**
 * Công cụ học tập — KHÔNG phải khóa học: không có giáo trình, không đăng ký,
 * không tiến độ/XP. Tách khỏi `COURSES` để không lọt vào trang chi tiết khóa
 * (`generateStaticParams`) hay số liệu tổng hợp nào đếm theo danh mục khóa.
 */
/* Ô "Python IDE" của TRANG CHỦ CŨ đã mồ côi — xoá 08/11/2026.
 *
 * `CatalogTool`, `IDE_TOOL` và `TOOLS` chỉ có MỘT người dùng là `CatalogTile`,
 * mà component đó bị xoá ở 4d5f86d khi trang chủ đổi sang cảnh "Góc học". Từ
 * lúc ấy chúng là dữ liệu không ai đọc. Hai chỗ còn nhắc tên `catalog.TOOLS`
 * (SiteHeader.tsx, site-nav.ts) chỉ là CHÚ THÍCH, không phải lời gọi — đúng bẫy
 * "đếm tham chiếu thô quét cả chú thích" đã ghi trong AGENTS.md, và cũng là lý
 * do `check-tai-nguyen-chet.mjs` không thấy: cổng đó quét `public/static`,
 * component `.tsx` và `.module.css`, KHÔNG quét export chết trong `lib/`.
 *
 * Thứ phát hiện ra nó là bộ e2e — ca "trang chủ chỉ còn ô Python và ô công cụ
 * Python IDE" đỏ vì `a[href="/ide"]` đếm được 0. Đo trên production: trang chủ
 * có ĐÚNG MỘT liên kết nội bộ, `/courses/python_advanced`.
 *
 * `/ide` KHÔNG mồ côi: nó tới được qua `SiteHeader` ở trang khoá học và qua 411
 * nút "Thử ngay trong IDE" ở màn đọc (sàn 300, `check-duong-toi.mjs` canh).
 * Cờ `NEXT_PUBLIC_IDE_ENABLED` vẫn còn và vẫn có tác dụng — nó ẩn mục IDE trên
 * thanh đầu trang (xem `site-nav.ts`); chỉ cái THẺ là không còn chỗ để hiện. */
