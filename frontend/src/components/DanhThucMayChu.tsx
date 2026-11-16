'use client';

import { useEffect } from 'react';

import { apiOrigin } from '@/lib/api';
import { taoBoDanhThuc } from '@/lib/danh-thuc-may-chu';

/**
 * Không vẽ gì: bắn đúng MỘT lượt `GET /health` mỗi phiên để máy chủ thức dậy trong lúc người
 * học đọc trang chủ / trang khoá học, trước khi họ mở bài. Lý lẽ, giới hạn và luật "KHÔNG
 * qua apiFetch" ở `lib/danh-thuc-may-chu.ts`.
 *
 * Bộ đánh thức dựng LÚC MOUNT (không ở tầng module): `apiOrigin()` đọc `window`, mà tầng
 * module chạy cả ở máy chủ khi prerender.
 */
export default function DanhThucMayChu() {
  useEffect(() => {
    taoBoDanhThuc({ origin: apiOrigin() })();
  }, []);
  return null;
}
