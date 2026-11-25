'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';
import { hasStoredSession, LS_ACCESS, LS_LEGACY_REFRESH } from '@/lib/course-progress';
import { isStaticCourse, readDone } from '@/lib/static-courses';

import type { BookshelfCourse } from './bookshelf-catalog';
import {
  buildProgressSnapshot,
  progressFromEnrolled,
  unknownProgress,
  type CourseProgressSnapshot,
} from './bookshelf-progress';

/** Một lượt đang bay dùng chung cho mọi thẻ trên cùng trang. */
let inFlight: Promise<unknown> | null = null;

function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function loadEnrolled(): Promise<unknown> {
  const session = {
    access: lsGet(LS_ACCESS),
    legacyRefresh: lsGet(LS_LEGACY_REFRESH),
    cookie: document.cookie,
  };
  if (!hasStoredSession(session)) return Promise.resolve(null);
  inFlight ??= apiFetch('/api/enrolled')
    .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function useBookshelfProgress(course: BookshelfCourse | undefined): CourseProgressSnapshot {
  const courseId = course?.courseId ?? null;
  const total = course?.lessonCount ?? 0;
  const [loaded, setLoaded] = useState<{ id: string; snap: CourseProgressSnapshot } | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    // Khoá tĩnh: dấu hoàn thành nằm trên máy, không hỏi API.
    const read = isStaticCourse(courseId)
      ? () => Promise.resolve(buildProgressSnapshot(readDone(courseId), total))
      : () => loadEnrolled().then((data) => progressFromEnrolled(data, courseId, total));
    const refresh = () =>
      void read().then((snap) => {
        if (!cancelled) setLoaded({ id: courseId, snap });
      });
    refresh();
    // Bấm "quay lại" từ bài học có thể khôi phục trang từ bộ nhớ đệm: đọc lại.
    window.addEventListener('pageshow', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', refresh);
    };
  }, [courseId, total]);

  return loaded && loaded.id === courseId ? loaded.snap : unknownProgress(total);
}
