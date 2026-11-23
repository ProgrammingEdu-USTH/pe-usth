// Trang chủ `/` — cảnh "GÓC HỌC": một căn phòng lofi, mỗi vật trong phòng là
// một lối vào (laptop → bài học, kệ sách → khoá học, bảng ghim → lộ trình,
// cuốn sổ → ôn tập, kệ cúp → thành tựu, điện thoại → hồ sơ và xếp hạng).
//
// Port từ artifact "Góc học PE" (một app Next 15 đứng riêng). Cảnh là DOM ra
// lệnh, không phải React — xem src/components/goc-hoc/StudyRoom.tsx để biết vì
// sao không viết lại thành React, và engine.js để biết nó làm gì.
//
// Bản dashboard theo Figma trước đây ở đúng đường dẫn này còn nguyên, đã dọn
// sang `/dashboard` để nhóm đối chiếu hai bản.
//
// BA ĐIỀU CHỐT Ở ĐÂY, đừng gỡ mà không đọc hết:
//
//  1. GIÁO TRÌNH DỰNG Ở SERVER, TĨNH. Tám học phần và 48 bài đọc từ
//     `curricula.json` ngay trong component server này rồi truyền xuống, nên
//     khách vãng lai thấy đủ phòng, đủ sách, đủ tên bài mà KHÔNG một lời gọi
//     mạng nào. Cùng nguồn với trang khoá học — xem bẫy "Hai nguồn danh sách
//     bài" trong AGENTS.md: đừng viết cứng số 48 ở đây.
//  2. SỐ CỦA NGƯỜI HỌC LẤY Ở CLIENT, VÀ CHỈ KHI ĐÃ CÓ PHIÊN. Trang này công
//     khai; `apiFetch` gặp 401 là tự tạo tài khoản khách, tức mỗi con bot một
//     tài khoản. Nhánh `test` chặn bằng `apiFetchSessionOnly`; main CHƯA áp
//     hợp đồng phiên đó (chủ dự án quyết 04/11: "vẫn để trang web mở cho khách
//     như hiện tại"), nên chặn nằm ở `laySo()` trong StudyRoom.tsx: không có
//     phiên đã lưu ⇒ trả sớm, KHÔNG một lời gọi nào. Bot không có phiên nên
//     không chạm API. Đừng gọi API ở đây, và đừng gỡ phép chặn ấy.
//  3. KHÔNG `PageStyles hrefs={[...]}` NÀO KHÁC RỖNG. Cảnh có CSS riêng
//     (scene.css, import trong StudyRoom.tsx). `PageStyles` ở đây chỉ để lấy
//     @font-face tự lưu trữ của Be Vietnam Pro + JetBrains Mono (PageStyles tự
//     thêm edu-fonts.css vào mọi trang) — thêm edu-theme.css vào thì nó đặt
//     lại nền, phông và `.page` của cả trang và cảnh sẽ lệch.
import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import DanhThucMayChu from '@/components/DanhThucMayChu';
import StudyRoom from '@/components/goc-hoc/StudyRoom';
import PageStyles from '@/components/PageStyles';
import { COURSES } from '@/lib/catalog';
import CURRICULA_JSON from '@/lib/curricula.json';
import { feedbackFormHref } from '@/lib/feedback-link';
import type { LessonMetaRow, ModuleRow } from '@/lib/goc-hoc';

const COURSE_ID = 'python_advanced';

/** Ẩn khỏi mắt nhưng GIỮ trong cây truy cập: clip chứ không display:none (xem chú thích ở khối <nav>). */
const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export const metadata: Metadata = {
  title: 'Programming EDU — Góc học',
};

export default function HomePage() {
  const course = COURSES.find((c) => c.id === COURSE_ID);
  const curricula = CURRICULA_JSON as unknown as {
    CURRICULA: Record<string, { modules?: ModuleRow[] }>;
    LESSON_META?: Record<string, LessonMetaRow[]>;
  };
  const modules = curricula.CURRICULA[COURSE_ID]?.modules ?? [];
  const meta = curricula.LESSON_META?.[COURSE_ID] ?? [];

  return (
    <>
      <PageStyles hrefs={[]} />
      {/*
        Điều hướng THẬT cho thứ không chạy JS. Cảnh Góc học là DOM do engine.js dựng ở client, nên HTML thô của
        trang chủ từng KHÔNG có một liên kết, một tiêu đề, một chữ nào (đo 23/11/2026 trên bản build: 0 / 0 / 0) —
        trình thu thập và trình đọc màn hình chỉ thấy <title>. Khối này ẩn theo kiểu "chỉ cho máy đọc" (không dùng
        display:none, kẻo giấu luôn khỏi trình đọc màn hình).
        CHỈ MỘT liên kết, tới `/courses/python_advanced` — cùng đích với ô khoá học trong cảnh. Trang chủ cố ý "một cửa":
        e2e `mobile-responsive` đòi không có `/ide` ở đây (08/11/2026, lối vào IDE nằm ở header trang khoá học), nên nav
        này KHÔNG trỏ `/ide` hay `/lesson/…` dù bản gốc có. Phần crawler thực sự thiếu là CHỮ (tiêu đề, mô tả, tên học phần).
        Viết lại từ nhánh `test` cf16be7: bản gốc trỏ `#map`, `#courses`, `#leaderboard` (neo của trang chủ cũ, không
        tồn tại ở đây) và liệt kê cả tên từng bài vào vùng điều hướng — 179 mục ẩn là nhiễu cho người dùng đọc màn hình.
        `tabIndex={-1}`: liên kết ẩn mà nhận focus bàn phím là "focus vô hình"; bàn phím đã có các vật trong cảnh.
      */}
      <nav aria-label="Điều hướng chính" style={SR_ONLY}>
        <h2>{course?.title ?? 'Python cho Data Analyst'}</h2>
        <p>{course?.description ?? ''}</p>
        <ul>
          <li>
            <Link tabIndex={-1} href={`/courses/${COURSE_ID}`}>
              Khoá học
            </Link>
          </li>
        </ul>
        <h3>Các học phần</h3>
        <ol>
          {modules.map((m) => (
            <li key={m.title}>{m.title}</li>
          ))}
        </ol>
      </nav>
      <DanhThucMayChu />
      <StudyRoom
        courseId={COURSE_ID}
        courseName={course?.title ?? 'Python cho Data Analyst'}
        lessonUrl={course?.lessonUrl ?? `/lesson/${COURSE_ID}`}
        modules={modules}
        meta={meta}
        feedbackUrl={feedbackFormHref()}
      />
    </>
  );
}
