'use client';

import { useCallback, useSyncExternalStore } from 'react';

import type { EpisodeId } from '@/lib/quan-may/episodes';
import { freshProgress, parseSave, reduce, SAVE_KEY, type Action, type Save } from '@/lib/quan-may/progress';

/** Bản trong bộ nhớ: bộ nhớ trình duyệt bị chặn thì bài vẫn chạy trong phiên. */
let cache: Save | null = null;
const listeners = new Set<() => void>();

function read(): Save {
  if (cache) return cache;
  let text: string | null = null;
  try {
    text = window.localStorage.getItem(SAVE_KEY);
  } catch {
    /* chế độ riêng tư */
  }
  cache = parseSave(text);
  return cache;
}

function write(next: Save) {
  cache = next;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  } catch {
    /* không lưu được thì thôi */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SAVE_KEY) return;
    cache = null;
    listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** `null` khi đang dựng ở máy chủ: chưa biết người học đang ở đâu. */
export function useSave(): Save | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function useDispatch(id: EpisodeId) {
  return useCallback(
    (action: Action) => {
      const save = read();
      const before = save.episodes[id] ?? freshProgress();
      const after = reduce(id, before, action);
      if (after !== before) write({ ...save, episodes: { ...save.episodes, [id]: after } });
    },
    [id],
  );
}
