'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';
import { hasStoredSession, LS_ACCESS, LS_LEGACY_REFRESH } from '@/lib/course-progress';

import type { BookshelfCourse } from './bookshelf-catalog';
import { progressFromEnrolled, unknownProgress, type CourseProgressSnapshot } from './bookshelf-progress';

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
  const courseId = course && !course.isMock ? course.courseId : null;
  const total = course?.lessonCount ?? 0;
  const [loaded, setLoaded] = useState<{ id: string; snap: CourseProgressSnapshot } | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    void loadEnrolled().then((data) => {
      if (!cancelled) setLoaded({ id: courseId, snap: progressFromEnrolled(data, courseId, total) });
    });
    return () => {
      cancelled = true;
    };
  }, [courseId, total]);

  return loaded && loaded.id === courseId ? loaded.snap : unknownProgress(total);
}
