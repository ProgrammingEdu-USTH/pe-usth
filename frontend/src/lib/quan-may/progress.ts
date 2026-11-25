/**
 * Quán Mây — trạng thái một tập. Một nguồn sự thật: màn hình suy ra từ đây,
 * và chỉ `reduce` được đổi nó. "Đã đạt" không nằm trong nút, biến cục bộ hay
 * hẹn giờ, nên vẽ lại hoặc tải lại không đổi tiến độ.
 */

import { canRun, CULPRIT, evaluate, EPISODE_IDS, SOLUTIONS, type EpisodeId } from './episodes.ts';

export const STEPS = 6;
export const SOLUTION_AFTER = 3;
export const SAVE_KEY = 'quanmay.v2';

export type Completion = 'none' | 'done' | 'seen';

export type EpisodeProgress = {
  current: number;
  /** Bước đã đạt điều kiện (1..5). */
  passed: number[];
  prediction: string;
  /** Đã xem bao nhiêu nhịp của phần làm mẫu. */
  watched: number;
  work: string[];
  /** Lượt chạy cuối; chỉ có giá trị khi `key` khớp cấu hình hiện tại. */
  lastRun: { key: string; ok: boolean } | null;
  attempts: number;
  hints: number;
  solutionShown: boolean;
  grouped: boolean;
  suspect: string;
  decision: string;
  /** Kết quả tốt nhất từng đạt, giữ nguyên khi chơi lại. */
  best: Completion;
};

export function freshProgress(best: Completion = 'none'): EpisodeProgress {
  return {
    current: 1, passed: [], prediction: '', watched: 0, work: [], lastRun: null,
    attempts: 0, hints: 0, solutionShown: false, grouped: false, suspect: '', decision: '', best,
  };
}

export const configKey = (work: readonly string[]) => work.join('|');

/** Bước xa nhất được mở: ngay sau chuỗi bước đã đạt liên tiếp từ 1. */
export function unlocked(p: EpisodeProgress): number {
  let step = 1;
  while (step < STEPS && p.passed.includes(step)) step += 1;
  return step;
}

export const isFinished = (p: EpisodeProgress) => unlocked(p) === STEPS && p.current === STEPS;

/** Kết quả đang được phép hiện: đúng cấu hình đang thấy, nếu không thì không có. */
export function currentRun(p: EpisodeProgress): { ok: boolean } | null {
  return p.lastRun && p.lastRun.key === configKey(p.work) ? p.lastRun : null;
}

export type Action =
  | { type: 'predict'; value: string }
  | { type: 'watch'; to: number; total: number }
  | { type: 'work'; work: string[] }
  | { type: 'run' }
  | { type: 'hint'; work?: string[] }
  | { type: 'solution' }
  | { type: 'group' }
  | { type: 'suspect'; code: string }
  | { type: 'decide'; value: string }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'replay' };

const pass = (p: EpisodeProgress, step: number): number[] =>
  p.passed.includes(step) ? p.passed : [...p.passed, step].sort((a, b) => a - b);

const unpass = (p: EpisodeProgress, step: number) => p.passed.filter((s) => s !== step);

export function reduce(id: EpisodeId, p: EpisodeProgress, a: Action): EpisodeProgress {
  switch (a.type) {
    case 'predict':
      return p.current === 1 ? { ...p, prediction: a.value, passed: pass(p, 1) } : p;
    case 'watch': {
      if (p.current !== 2) return p;
      const watched = Math.max(p.watched, Math.min(a.to, a.total));
      return { ...p, watched, passed: watched >= a.total ? pass(p, 2) : p.passed };
    }
    case 'work':
      if (p.current !== 3) return p;
      // Đổi đầu vào là bỏ kết quả cũ và khoá lại bước sau.
      return { ...p, work: a.work, lastRun: null, passed: unpass(p, 3) };
    case 'run': {
      if (p.current !== 3 || !canRun(id, p.work)) return p;
      const ok = evaluate(id, p.work);
      return {
        ...p,
        lastRun: { key: configKey(p.work), ok },
        attempts: p.attempts + 1,
        passed: ok ? pass(p, 3) : unpass(p, 3),
      };
    }
    case 'hint':
      if (p.current !== 3 || p.attempts === 0) return p;
      return a.work
        ? { ...p, hints: p.hints + 1, work: a.work, lastRun: null, passed: unpass(p, 3) }
        : { ...p, hints: p.hints + 1 };
    case 'solution':
      if (p.current !== 3 || p.attempts < SOLUTION_AFTER) return p;
      return { ...p, solutionShown: true, work: [...SOLUTIONS[id]], lastRun: null, passed: unpass(p, 3) };
    case 'group':
      return p.current === 4 && id === 'ket-hut-tien' ? { ...p, grouped: true } : p;
    case 'suspect':
      if (p.current !== 4 || id !== 'ket-hut-tien' || !p.grouped) return p;
      return { ...p, suspect: a.code, passed: a.code === CULPRIT ? pass(p, 4) : unpass(p, 4) };
    case 'decide':
      // Trả lời một lần.
      if (p.current !== 5 || p.decision) return p;
      return { ...p, decision: a.value, passed: pass(p, 5) };
    case 'next': {
      // Bước 4 của tập xếp đơn chỉ là đọc, nên đi tiếp là đạt.
      const passed = p.current === 4 && id === 'xep-don' ? pass(p, 4) : p.passed;
      if (p.current >= STEPS || !passed.includes(p.current)) return p;
      const moved = { ...p, passed, current: p.current + 1 };
      if (!isFinished(moved)) return moved;
      const result: Completion = moved.solutionShown ? 'seen' : 'done';
      return { ...moved, best: moved.best === 'done' ? 'done' : result };
    }
    case 'back':
      return p.current > 1 ? { ...p, current: p.current - 1 } : p;
    case 'replay':
      return freshProgress(p.best);
  }
}

export type Save = { v: 2; episodes: Partial<Record<EpisodeId, EpisodeProgress>> };

const emptySave = (): Save => ({ v: 2, episodes: {} });

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const count = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : 0);

/** Đọc một tập từ dữ liệu lạ: trường nào sai kiểu thì về mặc định. */
function readEpisode(raw: unknown): EpisodeProgress {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const work = Array.isArray(r.work) ? r.work.filter((w): w is string => typeof w === 'string') : [];
  const run = r.lastRun as { key?: unknown; ok?: unknown } | null | undefined;
  const p: EpisodeProgress = {
    current: count(r.current) || 1,
    passed: Array.isArray(r.passed)
      ? [...new Set(r.passed.filter((s): s is number => count(s) > 0 && (s as number) < STEPS))].sort((a, b) => a - b)
      : [],
    prediction: str(r.prediction),
    watched: count(r.watched),
    work,
    lastRun: run && typeof run.key === 'string' && typeof run.ok === 'boolean' ? { key: run.key, ok: run.ok } : null,
    attempts: count(r.attempts),
    hints: count(r.hints),
    solutionShown: r.solutionShown === true,
    grouped: r.grouped === true,
    suspect: str(r.suspect),
    decision: str(r.decision),
    best: r.best === 'done' || r.best === 'seen' ? r.best : 'none',
  };
  p.current = Math.min(p.current, unlocked(p));
  return p;
}

export function parseSave(text: string | null): Save {
  if (!text) return emptySave();
  try {
    const data = JSON.parse(text) as { v?: unknown; episodes?: unknown };
    if (!data || data.v !== 2 || !data.episodes || typeof data.episodes !== 'object') return emptySave();
    const save = emptySave();
    for (const id of EPISODE_IDS) {
      const raw = (data.episodes as Record<string, unknown>)[id];
      if (raw) save.episodes[id] = readEpisode(raw);
    }
    return save;
  } catch {
    return emptySave();
  }
}
