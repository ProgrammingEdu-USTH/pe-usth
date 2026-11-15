// AI LÀ BÀI NÀY, VÀ NHÁP CỦA NÓ NẰM Ở KHOÁ NÀO — hai phép tính nhỏ mà sai được
// một cách IM LẶNG, nên chúng ở một file riêng và có test gọi thẳng.
//
// VÌ SAO LÀ FILE RIÊNG, cùng lý lẽ đã viết cho `curriculum-nav.ts`:
//
//  1. `soBaiTuTruyVan` — link từ trang khoá học truyền chỉ số 0-based
//     (`?lesson=11`) còn bảng `lessons` đánh số từ 1 (`sort_order`). AGENTS.md
//     đã ghi một vụ lệch MỘT đơn vị ở đúng chỗ này: "quên `- 1` thì vẫn mở
//     đúng module ở hầu hết các bài, chỉ sai ở bài ĐẦU của mỗi module" — tức
//     nó hỏng im lặng. Trước bản này phép tính ấy nằm inline trong
//     `lesson/python_advanced/page.tsx` và KHÔNG có ca test nào.
//
//  2. `khoaNhap` / `hauToNhap` — khoá `localStorage` của bản nháp. Trước bản
//     này khuôn `PREFIX:owner:course:lesson` được dựng **HAI LẦN trong chính
//     `useLessonDraft.ts`** (chỗ tự lưu và chỗ `restore`), và trang lỗi cần nó
//     lần thứ ba. Ba bản chép của một khuôn khoá là ba thứ trôi được, và khi
//     chúng trôi thì học viên mất nháp mà không ai thấy — không exception nào
//     ném, `getItem` chỉ trả `null`.
//
// Đổi tên khoá = mọi người mất bản nháp đang có. Đó là lý do `TIEN_TO_NHAP`
// mang hậu tố `-v1` và chỉ được đổi khi CỐ Ý bỏ nháp cũ.

/** Tiền tố khoá `localStorage` của bản nháp bài học. */
export const TIEN_TO_NHAP = 'pe-studio-lesson-v1';

/**
 * Phần SAU chủ sở hữu trong khoá nháp: `:<khoá>:<bài>`.
 *
 * Trang lỗi dùng riêng phần này, vì nó KHÔNG biết `owner` (id học viên nằm
 * trong phản hồi API, mà trang lỗi cố ý không gọi API). Khớp theo hậu tố là đủ
 * hẹp: `localStorage` của một origin chỉ chứa nháp của chính máy đó.
 */
export function hauToNhap(courseId: string, lessonNo: number): string {
  return `:${courseId}:${lessonNo}`;
}

/** Khoá nháp đầy đủ của một học viên cho một bài. */
export function khoaNhap(owner: number, courseId: string, lessonNo: number): string {
  return `${TIEN_TO_NHAP}:${owner}${hauToNhap(courseId, lessonNo)}`;
}

/**
 * `?lesson=` (0-based, có thể thiếu/rác) → `sort_order` (đếm từ 1).
 *
 * Mọi đầu vào không phải số nguyên ≥ 0 đều về bài 1: một URL bị cắt hay bị gõ
 * tay không được đưa học viên tới một bài không có.
 */
export function soBaiTuTruyVan(lesson: string | undefined): number {
  const i = Number(lesson);
  return lesson === undefined || !Number.isInteger(i) || i < 0 ? 1 : i + 1;
}
