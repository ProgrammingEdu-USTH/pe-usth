/**
 * daily-practice.ts — Luồng dữ liệu và hợp đồng cho màn "Ôn tập hằng ngày"
 *
 * Màn ôn tập kết hợp lần lượt câu trắc nghiệm và bài code thực chiến (chạy Pyodide).
 * Hỗ trợ cờ cấu hình chuyển đổi giữa mock data cục bộ và API backend.
 */

import mockData from './mock/practice-daily.json' with { type: 'json' };

export type DailyQuizItem = {
  id: string;
  type: 'quiz';
  lesson_id: number;
  lesson_title: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type DailyCodeTestCase = {
  name: string;
  call: string;
  expected: string;
};

export type DailyCodeItem = {
  id: string;
  type: 'code';
  lesson_id: number;
  lesson_title: string;
  title: string;
  description: string;
  starterCode: string;
  tests: DailyCodeTestCase[];
  solution?: string;
  hints?: { title: string; body: string }[];
};

export type DailyPracticeItem = DailyQuizItem | DailyCodeItem;

export type DailyPracticeSession = {
  session_id: string;
  course_id: string;
  title: string;
  total_items: number;
  items: DailyPracticeItem[];
};

/**
 * Cờ cấu hình: mặc định dùng dữ liệu giả (`true`).
 * Khi backend sẵn sàng, chỉ cần đặt `NEXT_PUBLIC_DAILY_PRACTICE_MOCK=false`.
 */
export const USE_DAILY_PRACTICE_MOCK =
  process.env.NEXT_PUBLIC_DAILY_PRACTICE_MOCK !== 'false';

/**
 * Đáp án ĐƯỢC PHÉP hiển thị: chỉ khi câu trắc nghiệm đã được giải xong (hoặc đã chốt lần hai).
 * Tránh đọc thẳng `item.correctIndex` khi học viên đang ở trạng thái suy nghĩ lại.
 */
export function visibleCorrectIndex(
  item: DailyQuizItem,
  resolved: boolean,
): number | null {
  return resolved ? item.correctIndex : null;
}

/**
 * Lời giải thích ĐƯỢC PHÉP hiển thị: chỉ khi câu trắc nghiệm đã kết thúc.
 */
export function visibleExplanation(
  item: DailyQuizItem,
  resolved: boolean,
): string | null {
  return resolved ? item.explanation : null;
}

/**
 * Nạp phiên ôn tập hằng ngày:
 * Khi cờ bật hoặc khi backend chưa sẵn sàng, trả về dữ liệu mock chuẩn cấu trúc.
 */
export async function fetchDailyPracticeSession(): Promise<DailyPracticeSession> {
  if (USE_DAILY_PRACTICE_MOCK) {
    return mockData as DailyPracticeSession;
  }

  // Luồng gọi API backend thật khi cờ chuyển sang false
  try {
    const res = await fetch('/api/quiz/generate-review', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        return data as DailyPracticeSession;
      }
    }
  } catch {
    /* Fallback sang mock nếu mạng gặp sự cố */
  }

  return mockData as DailyPracticeSession;
}
