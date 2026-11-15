'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DATA } from '@/components/goc-hoc/scene-data';
import { apiFetch, asList, findEnrollment } from '@/lib/api';
import CURRICULA_JSON from '@/lib/curricula.json';
import {
  readIdeCodeOnLoad,
  sessionStorageOrNull,
  forgetIdeReloadCode,
  IDE_RELOAD_CODE_KEY,
} from '@/lib/ide-handoff';
import { isRunnerDown } from '@/lib/runner-error';
import { PyodideRunner } from '@/components/python-studio/runner/pyodide-runner';
import {
  fetchDailyPracticeSession,
  visibleCorrectIndex,
  visibleExplanation,
  type DailyPracticeItem,
  type DailyQuizItem,
  type DailyCodeItem,
  type DailyPracticeSession,
} from '@/lib/daily-practice';
import {
  COURSE_ID,
  ENROLLED_PATH,
  TOTAL_LESSONS,
  answersPayload,
  completedLessons,
  historyPath,
  readGeneratedQuiz,
  readGradedQuestions,
  recentReviews,
  reviewPath,
  submitPath,
} from '@/lib/practice-plan';
import type { StudioLesson } from '@/lib/studio-lesson';
import styles from './lofi-workspace.module.css';

export type LofiScreenType = 'lesson' | 'ide' | 'practice';
export type ChillScreenType = LofiScreenType;


const STICKY_COLORS = ['#fff3b0', '#ffd6e0', '#d8f3dc', '#dceeff', '#ffe5b4'];
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/* ==========================================================================
   THÔNG SỐ CẢNH PHÒNG HỌC GỐC TỪ GÓC HỌC (2752 × 1536)
   ========================================================================== */
const BULBS: [number, number][] = [
  [1430, 112], [1012, 116], [1870, 122], [1451, 130], [1405, 138], [1031, 142],
  [1489, 146], [1823, 150], [1884, 156], [1076, 157], [1358, 162], [1258, 168],
  [1589, 171], [1004, 172], [1179, 172], [1544, 173], [1768, 173], [1670, 174],
  [1313, 177], [1138, 181], [1724, 184], [1226, 191], [1638, 192], [1888, 200],
  [988, 220],  [1866, 244], [991, 284],  [1885, 303], [1009, 320], [1869, 354],
  [1011, 359], [1883, 399], [990, 414],  [1878, 461], [1000, 466], [988, 504],
  [1857, 508], [1008, 557], [1881, 567], [995, 610],  [1871, 625], [995, 657],
  [1877, 676], [1861, 714], [1007, 718], [1874, 769], [1004, 774], [1880, 806],
  [1019, 820], [1872, 874], [1878, 913], [1894, 957], [1892, 1043], [1900, 1068],
];

const CITY_LIGHTS: [number, number, number, number][] = [
  [1112, 722, 34, 48],
  [1282, 990, 130, 100],
  [1748, 902, 150, 110],
  [1535, 920, 30, 40],
  [1580, 745, 28, 38],
];

const STARS_POS: [number, number, number][] = [
  [85, 42, -0.4], [164, 96, -1.8], [248, 54, -2.5], [312, 128, -0.9],
  [448, 68, -1.3], [526, 118, -2.9], [612, 52, -0.7], [698, 104, -2.1],
  [742, 156, -1.5], [128, 182, -3.1], [584, 192, -0.2], [280, 210, -2.4],
];

const DUST_MOTES: [number, number, number][] = [
  [910, 980, 0], [985, 1045, -1.8], [1060, 995, -3.4], [1140, 1080, -5.1],
  [1215, 1010, -2.2], [895, 1120, -4.6], [1095, 1150, -1.1], [1245, 1095, -6.3],
];

/* ==========================================================================
   DANH MỤC 48 BÀI HỌC THẬT TỪ CURRICULA.JSON
   ========================================================================== */
interface CatalogLessonItem {
  no: number;
  code: string;
  title: string;
  moduleTitle: string;
  moduleShort: string;
  minutes: number;
  xp: number;
}

const CATALOG_LESSONS: CatalogLessonItem[] = (() => {
  const raw = CURRICULA_JSON as unknown as {
    CURRICULA: Record<string, { modules?: { title: string; lessons: string[] }[] }>;
    LESSON_META?: Record<string, { code: string; minutes: number; xp: number }[]>;
  };
  const mods = raw.CURRICULA[COURSE_ID]?.modules ?? [];
  const metas = raw.LESSON_META?.[COURSE_ID] ?? [];
  const out: CatalogLessonItem[] = [];
  let no = 1;
  for (const m of mods) {
    const modShort = m.title.split('·')[0]?.trim() || 'M1';
    for (const l of m.lessons) {
      const meta = metas[no - 1];
      const parts = l.split('·');
      const code = parts.length > 1 ? parts[0].trim() : meta?.code || `B${no}`;
      const title = parts.length > 1 ? parts.slice(1).join('·').trim() : l.trim();
      out.push({
        no,
        code,
        title,
        moduleTitle: m.title,
        moduleShort: modShort,
        minutes: meta?.minutes ?? 25,
        xp: meta?.xp ?? 15,
      });
      no += 1;
    }
  }
  return out;
})();

const DEFAULT_IDE_CODE = `import os

def khoi_tao_tien_trinh(ten_tac_vu: str):
    pid = os.getpid()
    print(f"🚀 [PID {pid}] Đang chạy tác vụ: {ten_tac_vu}")

if __name__ == "__main__":
    khoi_tao_tien_trinh("Lofi_Rain_Synthesizer")
    khoi_tao_tien_trinh("Python_Code_Runner")`;

const DEFAULT_IDE_OUT = `$ python3 main.py
🚀 [PID 4821] Đang chạy tác vụ: Lofi_Rain_Synthesizer
🚀 [PID 4821] Đang chạy tác vụ: Python_Code_Runner

✓ Chương trình đã chạy xong.`;

export interface StickyNoteItem {
  id: number;
  tabLabel: string;
  bg: string;
  lessonTag: string;
  question: string;
  options: string[];
  ans: number;
  explain: string;
  tip: string;
}

interface PoolMcqItem {
  lessonNo: number;
  lessonCode: string;
  lessonTitle: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const ALL_META_ENTRIES = Object.entries(DATA.meta) as [string, [number, number, number, number]][];

export default function LofiWorkspace({
  initialScreen = 'lesson',
  initialLessonIdx = 0,
  embedded = false,
  onEmbeddedSwitch,
  onProgressChange,
}: {
  initialScreen?: LofiScreenType;
  initialLessonIdx?: number;
  embedded?: boolean;
  onEmbeddedSwitch?: (nextScreen: LofiScreenType, nextLessonIdx?: number) => void;
  onProgressChange?: (doneLessons: number[], xp: number) => void;
}) {
  const [activeScreen, setActiveScreen] = useState<LofiScreenType>(initialScreen);
  const [roomLayout, setRoomLayout] = useState({ scale: 0.65, ox: 0, oy: 0 });
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  // Tiến độ người học thật (đồng bộ giữa Backend API & localStorage)
  const [doneLessons, setDoneLessons] = useState<number[]>([]);
  const [xp, setXp] = useState<number>(0);

  // Trạng thái Bài học: Quyển sách mở 2 trang (48 bài thật từ giáo trình)
  const [spreadIdx, setSpreadIdx] = useState(0);
  const [lessonIdx, setLessonIdx] = useState<number>(() => {
    const safe = Number.isInteger(initialLessonIdx) && initialLessonIdx >= 0 && initialLessonIdx < CATALOG_LESSONS.length
      ? initialLessonIdx
      : 0;
    return safe;
  });
  const [flipDir, setFlipDir] = useState<'next' | 'prev'>('next');
  const [lessonContent, setLessonContent] = useState<StudioLesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState<boolean>(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonReloadKey, setLessonReloadKey] = useState<number>(0);

  const prevInitialScreenRef = useRef(initialScreen);
  useEffect(() => {
    if (prevInitialScreenRef.current !== initialScreen) {
      prevInitialScreenRef.current = initialScreen;
      setActiveScreen(initialScreen);
    }
  }, [initialScreen]);

  const prevInitialLessonIdxRef = useRef(initialLessonIdx);
  useEffect(() => {
    if (
      Number.isInteger(initialLessonIdx) &&
      initialLessonIdx >= 0 &&
      initialLessonIdx < CATALOG_LESSONS.length &&
      prevInitialLessonIdxRef.current !== initialLessonIdx
    ) {
      prevInitialLessonIdxRef.current = initialLessonIdx;
      setLessonIdx(initialLessonIdx);
      setSpreadIdx(0);
    }
  }, [initialLessonIdx]);

  // Trạng thái tương tác trên các trang sách của từng bài
  const [pickedPredict, setPickedPredict] = useState<Record<string, number>>({});
  const [pickedMcq, setPickedMcq] = useState<Record<string, number>>({});
  const [pickedScaffold, setPickedScaffold] = useState<Record<string, string>>({});
  const [pickedCounter, setPickedCounter] = useState<Record<string, string>>({});
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  const [showSolution, setShowSolution] = useState<Record<number, boolean>>({});
  const [completeBanner, setCompleteBanner] = useState<string>('');

  // Trạng thái Bàn thí nghiệm (Laptop VS Code 70/30)
  const [ideCustomCode, setIdeCustomCode] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_IDE_CODE;
    return readIdeCodeOnLoad(window.location.hash, sessionStorageOrNull()) ?? DEFAULT_IDE_CODE;
  });
  const [ideOutput, setIdeOutput] = useState<string>(DEFAULT_IDE_OUT);
  const [ideRunning, setIdeRunning] = useState<boolean>(false);
  const pyRunnerRef = useRef<PyodideRunner | null>(null);

  // Trạng thái Sổ tay Giấy nhớ Ôn tập (Practice)
  const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([]);
  const [noteIdx, setNoteIdx] = useState(0);
  const [notePicks, setNotePicks] = useState<Record<number, number>>({});
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null);
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewHistory, setReviewHistory] = useState<string[]>([]);

  const shellRef = useRef<HTMLDivElement>(null);

  // Xoá mã tạm sau khi nạp từ sessionStorage (chuẩn IdeClient)
  useEffect(() => {
    forgetIdeReloadCode(sessionStorageOrNull());
  }, []);

  // Khởi tạo PyodideRunner làm ấm ở nền để Bàn thí nghiệm luôn chạy được Python 3.12 thật
  useEffect(() => {
    const runner = new PyodideRunner();
    pyRunnerRef.current = runner;
    runner.prewarm();
    return () => {
      runner.dispose();
      pyRunnerRef.current = null;
    };
  }, []);

  // Đọc tham số ?lesson=... trên URL nếu có, và lắng nghe nút Back/Forward của trình duyệt
  useEffect(() => {
    if (embedded) return;
    const syncFromUrl = () => {
      const path = window.location.pathname;
      if (path.endsWith('/ide')) {
        setActiveScreen('ide');
        const handoff = readIdeCodeOnLoad(window.location.hash, sessionStorageOrNull());
        if (handoff) setIdeCustomCode(handoff);
      } else if (path.endsWith('/practice')) {
        setActiveScreen('practice');
      } else if (path.includes('/lesson/')) {
        setActiveScreen('lesson');
      }
      const params = new URLSearchParams(window.location.search);
      const lParam = params.get('lesson');
      if (lParam !== null) {
        const parsed = Number(lParam);
        if (Number.isInteger(parsed) && parsed >= 0 && parsed < CATALOG_LESSONS.length) {
          setLessonIdx(parsed);
          setSpreadIdx(0);
        }
      }
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [embedded]);

  // Hàm chuyển màn không reload trang, đồng bộ URL thật
  const switchScreen = useCallback(
    (nextScreen: LofiScreenType, nextLessonIdx?: number) => {
      const targetLesson = nextLessonIdx ?? lessonIdx;
      setActiveScreen(nextScreen);
      if (embedded) {
        if (onEmbeddedSwitch) {
          onEmbeddedSwitch(nextScreen, targetLesson);
        }
        return;
      }
      if (typeof window !== 'undefined') {
        let targetUrl = `/lesson/${COURSE_ID}?lesson=${targetLesson}`;
        if (nextScreen === 'ide') {
          targetUrl = '/ide';
        } else if (nextScreen === 'practice') {
          targetUrl = '/practice';
        }
        if (window.location.pathname + window.location.search !== targetUrl) {
          window.history.pushState(null, '', targetUrl);
        }
      }
    },
    [embedded, lessonIdx, onEmbeddedSwitch],
  );

  useEffect(() => {
    if (onProgressChange) {
      onProgressChange(doneLessons, xp);
    }
  }, [doneLessons, xp, onProgressChange]);

  // Nạp tiến độ người học & lịch sử ôn tập trực tiếp từ Backend API
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [userRes, enrolledRes, histRes] = await Promise.all([
          apiFetch('/api/user').then((r) => (r.ok ? r.json() : null)).catch(() => null),
          apiFetch(ENROLLED_PATH).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          apiFetch(historyPath(COURSE_ID)).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (!alive) return;
        if (userRes && typeof userRes.xp === 'number') {
          setXp(userRes.xp);
        }
        if (enrolledRes) {
          const row = findEnrollment(asList(enrolledRes, 'enrolled'), COURSE_ID);
          const done = completedLessons(row?.completedLessonNumbers, TOTAL_LESSONS);
          if (done.length) {
            setDoneLessons((prev) => Array.from(new Set([...prev, ...done])).sort((a, b) => a - b));
          }
        }
        if (histRes) {
          const past = recentReviews((histRes as { history?: unknown })?.history, 4);
          if (past.length) {
            const lines = past.map((p) => `Lượt ôn trước · Đúng ${p.score} trên ${p.total} tờ`);
            setReviewHistory(lines);
          }
        }
      } catch {
        /* Máy chủ backend chưa bật hoặc mất kết nối */
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Nạp nội dung bài học bắt buộc từ Backend API (lessonIdx: 0..47 -> lessonNo: 1..48)
  const currentCatalog = CATALOG_LESSONS[lessonIdx] ?? CATALOG_LESSONS[0];
  const lessonNo = currentCatalog.no;

  useEffect(() => {
    let alive = true;
    setLessonLoading(true);
    setLessonError(null);
    setCompleteBanner('');

    (async () => {
      try {
        const apiRes = await apiFetch(
          `/api/courses/${encodeURIComponent(COURSE_ID)}/lessons/${lessonNo}/content`,
        );
        if (!alive) return;
        if (apiRes.ok) {
          const payload = (await apiRes.json()) as { lesson?: { contentJson?: StudioLesson } };
          if (payload?.lesson?.contentJson) {
            setLessonContent(payload.lesson.contentJson);
            setLessonLoading(false);

            // Làm ấm các gói thư viện của bài (numpy, pandas, matplotlib, sqlite3) nếu có
            const pkgs = payload.lesson.contentJson?.step_4?.packages;
            if (pkgs?.length) {
              pyRunnerRef.current?.prewarm(pkgs);
            }
            return;
          }
        }
        setLessonError('Không thể tải bài học từ máy chủ. Vui lòng kiểm tra backend.');
      } catch {
        if (!alive) return;
        setLessonError('Không thể kết nối máy chủ bài học. Vui lòng khởi động backend và bấm Thử lại.');
      } finally {
        if (alive) setLessonLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [lessonNo, lessonReloadKey]);

  // Căn tỷ lệ khung cảnh 2752 × 1536 chuẩn theo engine.js của Góc học
  useEffect(() => {
    const updateLayout = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const IW = 2752;
      const IH = 1536;
      const s = Math.max(W / IW, H / IH);
      const ox = (W - IW * s) * 0.5;
      const oy = Math.min(0, (H - IH * s) * 0.8);
      setRoomLayout({ scale: s, ox, oy });
    };
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const vw = window.innerWidth || 1440;
    const vh = window.innerHeight || 900;
    const nx = (e.clientX / vw - 0.5) * 2;
    const ny = (e.clientY / vh - 0.5) * 2;
    setParallax({ x: -nx * 6, y: -ny * 4 });

    if (shellRef.current) {
      const rect = shellRef.current.getBoundingClientRect();
      shellRef.current.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      shellRef.current.style.setProperty('--my', `${e.clientY - rect.top}px`);
    }
  };

  /* ==========================================================================
     BƯỚC 1: ĐỘNG CƠ CHẠY CODE PYTHON THẬT TRONG BÀN THÍ NGHIỆM (IDE)
     ========================================================================== */
  const handleRunIdeCode = useCallback(async () => {
    if (ideRunning) return;
    setIdeRunning(true);
    setIdeOutput('$ python3 main.py\n⏳ Đang chạy mã Python...');

    const codeToRun = ideCustomCode;
    const t0 = performance.now();

    // 1. Thử gửi lên máy chủ POST /api/python/run (với trần chờ 3.2s)
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3200);
      const res = await apiFetch('/api/python/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToRun }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const body = (await res.json().catch(() => null)) as {
          stdout?: string;
          stderr?: string;
          exitCode?: number | null;
          timedOut?: boolean;
          outputTruncated?: boolean;
          durationMs?: number;
        } | null;

        if (
          body &&
          typeof body.stdout === 'string' &&
          typeof body.stderr === 'string' &&
          !isRunnerDown({
            stdout: body.stdout,
            stderr: body.stderr,
            exitCode: body.exitCode ?? 0,
            timedOut: Boolean(body.timedOut),
            outputTruncated: Boolean(body.outputTruncated),
          })
        ) {
          const outLines = ['$ python3 main.py'];
          if (body.stdout.trim()) outLines.push(body.stdout.trimEnd());
          if (body.stderr.trim()) outLines.push(body.stderr.trimEnd());
          if (!body.stdout.trim() && !body.stderr.trim()) {
            outLines.push('(Chương trình kết thúc không có đầu ra)');
          }
          const sec = ((body.durationMs ?? performance.now() - t0) / 1000).toFixed(2);
          outLines.push(`\n✓ Đã chạy xong trong ${sec}s (Mã thoát: ${body.exitCode ?? 0}).`);
          setIdeOutput(outLines.join('\n'));
          setIdeRunning(false);
          return;
        }
      }
    } catch {
      /* Máy chủ tắt hoặc không có Docker -> chuyển sang chạy bằng Pyodide trong trình duyệt */
    }

    // 2. Chạy thật bằng Pyodide Web Worker (CPython 3.12 ngay trong trình duyệt)
    try {
      let runner = pyRunnerRef.current;
      if (!runner) {
        runner = new PyodideRunner();
        pyRunnerRef.current = runner;
      }
      const pyRes = await runner.run(
        {
          code: codeToRun,
          tests: [],
          forbid: [],
          files: lessonContent?.step_4?.files ?? [],
          packages: lessonContent?.step_4?.packages ?? [],
        },
        (statusText) => {
          setIdeOutput(`$ python3 main.py\n⏳ ${statusText}`);
        },
      );

      if (pyRes) {
        const outLines = ['$ python3 main.py'];
        if (pyRes.output && pyRes.output.trim()) {
          outLines.push(pyRes.output.trimEnd());
        }
        if (pyRes.error && pyRes.error.trim()) {
          outLines.push(`⚠️ ${pyRes.error.trimEnd()}`);
        }
        if ((!pyRes.output || !pyRes.output.trim()) && (!pyRes.error || !pyRes.error.trim())) {
          outLines.push('(Chương trình đã chạy xong, không có đầu ra in lên màn hình)');
        }
        const durSec = ((pyRes.duration || performance.now() - t0) / 1000).toFixed(2);
        outLines.push(
          `\n${pyRes.error ? '✗ Dừng do lỗi' : '✓ Chương trình đã chạy xong'} (${durSec}s · ${
            pyRes.version ? `Python ${pyRes.version}` : 'Python 3.12'
          }).`,
        );
        setIdeOutput(outLines.join('\n'));
      } else {
        setIdeOutput('$ python3 main.py\n⚠️ Lượt chạy đã bị huỷ.');
      }
    } catch (err) {
      setIdeOutput(
        `$ python3 main.py\n⚠️ Không chạy được mã: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`,
      );
    } finally {
      setIdeRunning(false);
    }
  }, [ideCustomCode, ideRunning, lessonContent]);

  // Mở nhanh một đoạn mã từ Sách Bài học sang Laptop Bàn thí nghiệm
  const openCodeInIde = useCallback(
    (codeSnippet: string) => {
      try {
        sessionStorageOrNull()?.setItem(IDE_RELOAD_CODE_KEY, codeSnippet);
      } catch {}
      setIdeCustomCode(codeSnippet);
      setIdeOutput(
        '$ python3 main.py\n💡 Đã nạp mã từ bài học vào main.py.\nBấm nút "Run Code" trên thanh tiêu đề (hoặc Ctrl+Enter) để chạy thử!',
      );
      switchScreen('ide');
    },
    [switchScreen],
  );

  /* ==========================================================================
     BƯỚC 2: LƯU TIẾN ĐỘ BÀI HỌC ĐÃ XONG & CỘNG XP THẬT
     ========================================================================== */
  const isCurrentLessonDone = doneLessons.includes(lessonNo);

  const handleCompleteLesson = useCallback(async () => {
    const reward = currentCatalog.xp || 15;
    if (!doneLessons.includes(lessonNo)) {
      const nextDone = [...doneLessons, lessonNo].sort((a, b) => a - b);
      setDoneLessons(nextDone);
      setXp((prev) => prev + reward);
      setCompleteBanner(`🎉 Đã lưu tiến độ: Bài ${lessonNo} (${currentCatalog.code}) đã xong (+${reward} XP)!`);
    } else {
      setCompleteBanner(`✓ Bài ${lessonNo} (${currentCatalog.code}) đã được ghi nhận xong từ trước.`);
    }

    // Đồng bộ lên Backend API nếu có kết nối
    try {
      const res = await apiFetch(`/api/lessons/${lessonNo}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: COURSE_ID,
          lessonTitle: `${currentCatalog.code} · ${currentCatalog.title}`,
          xpEarned: reward,
          quizScore: 100,
        }),
      });
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as { xpGained?: number } | null;
        if (body && typeof body.xpGained === 'number' && body.xpGained > 0) {
          setCompleteBanner(
            `🎉 Đã lưu lên máy chủ: Bài ${lessonNo} đã xong (+${body.xpGained} XP)!`,
          );
        }
      }
    } catch {
      /* lỗi kết nối server khi lưu tiến độ */
    }
  }, [currentCatalog, doneLessons, lessonNo]);

  /* ==========================================================================
     BƯỚC 3: RÚT XẤP GIẤY NHỚ ÔN TẬP TỪ BACKEND API & NỘP BÀI CHẤM ĐIỂM
     ========================================================================== */
  const currentNote = stickyNotes[noteIdx] ?? stickyNotes[0];
  const currentNotePick = notePicks[noteIdx];
  const correctNotesCount = stickyNotes.filter((n, idx) => notePicks[idx] !== undefined && notePicks[idx] === n.ans).length;
  const answeredNotesCount = Object.keys(notePicks).length;

  const handleDrawFreshNotes = useCallback(async () => {
    setReviewLoading(true);
    setReviewError(null);
    setNotePicks({});
    setNoteIdx(0);

    // Rút đề có trọng số từ Backend POST /api/courses/python_advanced/quiz/generate-review
    try {
      const res = await apiFetch(reviewPath(COURSE_ID), { method: 'POST' });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const msg = errBody?.message;
        if (typeof msg === 'string' && (msg.includes('chưa đủ') || msg.includes('ít nhất') || msg.includes('hoàn' + 'thành'))) {
          setReviewError('Bạn cần học xong ít nhất 2 bài trên hệ thống trước khi mở xấp giấy nhớ ôn tập.');
        } else {
          setReviewError(typeof msg === 'string' ? msg : 'Chưa thể tạo xấp giấy nhớ ôn tập từ máy chủ.');
        }
        setStickyNotes([]);
        return;
      }
      const body = await res.json().catch(() => null);
      const parsed = readGeneratedQuiz(body);
      if (parsed && parsed.questions.length > 0) {
        setActiveQuizId(parsed.quizId);
        const mapped: StickyNoteItem[] = parsed.questions.slice(0, 5).map((q, idx) => ({
          id: idx + 1,
          tabLabel: `Tờ ${idx + 1}`,
          bg: STICKY_COLORS[idx % STICKY_COLORS.length],
          lessonTag: `Câu ôn #${idx + 1}`,
          question: q.question,
          options: q.options.map((opt, oIdx) =>
            /^[A-E]\.\s/.test(opt) ? opt : `${LETTERS[oIdx] ?? '•'}. ${opt}`,
          ),
          ans: -1, // Sẽ được cập nhật từ máy chủ sau khi nộp bài
          explain: '',
          tip: 'Chọn phương án bạn cho là phù hợp nhất.',
        }));
        setStickyNotes(mapped);
      } else {
        setReviewError('Máy chủ không trả về câu hỏi hợp lệ.');
        setStickyNotes([]);
      }
    } catch {
      setReviewError('Không thể kết nối máy chủ để lấy đề ôn tập. Vui lòng kiểm tra backend và bấm Thử lại.');
      setStickyNotes([]);
    } finally {
      setReviewLoading(false);
    }
  }, []);

  // Tự động tải xấp giấy nhớ khi người học mở màn hình Ôn tập
  useEffect(() => {
    if (activeScreen === 'practice' && stickyNotes.length === 0 && !reviewLoading && !reviewError) {
      void handleDrawFreshNotes();
    }
  }, [activeScreen, stickyNotes.length, reviewLoading, reviewError, handleDrawFreshNotes]);

  // Khi chọn phương án trên tờ giấy nhớ: ghi nhận và nộp bài chấm điểm
  const handlePickStickyOption = useCallback(
    async (tIdx: number, oIdx: number) => {
      const note = stickyNotes[tIdx];
      if (!note) return;
      const nextPicks = { ...notePicks, [tIdx]: oIdx };
      setNotePicks(nextPicks);

      // Nếu đã chọn đủ tất cả các tờ, tự động gửi nộp bài lên Backend chấm điểm
      if (activeQuizId !== null && Object.keys(nextPicks).length === stickyNotes.length) {
        try {
          const picksArr = stickyNotes.map((_, i) => nextPicks[i] ?? null);
          const res = await apiFetch(submitPath(activeQuizId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: answersPayload(picksArr, stickyNotes.length) }),
          });
          if (res.ok) {
            const body = (await res.json().catch(() => null)) as {
              score?: number;
              total?: number;
              detail?: unknown;
            } | null;
            if (body?.detail) {
              const graded = readGradedQuestions(
                stickyNotes.map((n, i) => ({
                  index: i,
                  question: n.question,
                  options: n.options,
                })),
                body.detail,
              );
              setStickyNotes((prev) =>
                prev.map((item, i) => ({
                  ...item,
                  ans: graded[i]?.correctIndex ?? item.ans,
                  explain: graded[i]?.explanation || 'Đã ghi nhận câu trả lời.',
                  tip: graded[i]?.isCorrect
                    ? 'Bạn đã chọn chính xác.'
                    : 'Xem kỹ lời giải thích để nắm chắc kiến thức.',
                })),
              );
              if (typeof body.score === 'number' && body.score > 0) {
                setXp((prev) => prev + (body.score ?? 0) * 20);
              }
            }
            // Tải lại lịch sử từ backend
            apiFetch(historyPath(COURSE_ID))
              .then((r) => (r.ok ? r.json() : null))
              .then((histRes) => {
                const past = recentReviews((histRes as { history?: unknown })?.history, 4);
                if (past.length) {
                  setReviewHistory(
                    past.map((p) => `Lượt ôn trước · Đúng ${p.score} trên ${p.total} tờ`),
                  );
                }
              })
              .catch(() => null);
          }
        } catch {
          /* lỗi kết nối khi submit */
        }
      }
    },
    [activeQuizId, notePicks, stickyNotes],
  );

  /* ==========================================================================
     BƯỚC 3B: ÔN TẬP HẰNG NGÀY THEO FIGMA (LẦN LƯỢT TRẮC NGHIỆM VÀ BÀI CODE)
     DÙNG DỮ LIỆU GIẢ TỪ practice-daily.json VÀ CỜ CẤU HÌNH TOGGLE
     ========================================================================== */
  const [dailySession, setDailySession] = useState<DailyPracticeSession | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [dailyItemIdx, setDailyItemIdx] = useState(0);
  const [dailyFinished, setDailyFinished] = useState(false);

  // Trạng thái trắc nghiệm
  const [quizPicks, setQuizPicks] = useState<Record<string, number>>({});
  const [quizResolved, setQuizResolved] = useState<Record<string, boolean>>({});
  const [quizRethinking, setQuizRethinking] = useState<Record<string, boolean>>({});
  const [quizLockedOption, setQuizLockedOption] = useState<Record<string, number>>({});
  const [quizFirstTryCorrect, setQuizFirstTryCorrect] = useState<Record<string, boolean>>({});

  // Trạng thái bài code
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
  const [codeOutputs, setCodeOutputs] = useState<Record<string, string>>({});
  const [codeTestResults, setCodeTestResults] = useState<
    Record<string, { name: string; passed: boolean; detail: string }[]>
  >({});
  const [codeSolved, setCodeSolved] = useState<Record<string, boolean>>({});
  const [codeHintsOpen, setCodeHintsOpen] = useState<Record<string, boolean>>({});
  const [codeRunning, setCodeRunning] = useState(false);

  const handleLoadDailySession = useCallback(async () => {
    setDailyLoading(true);
    setDailyError(null);
    setDailyFinished(false);
    setDailyItemIdx(0);
    setQuizPicks({});
    setQuizResolved({});
    setQuizRethinking({});
    setQuizLockedOption({});
    setQuizFirstTryCorrect({});
    setCodeTestResults({});
    setCodeSolved({});

    try {
      const session = await fetchDailyPracticeSession();
      setDailySession(session);
      const initialCodes: Record<string, string> = {};
      const initialOutputs: Record<string, string> = {};
      for (const item of session.items) {
        if (item.type === 'code') {
          initialCodes[item.id] = item.starterCode;
          initialOutputs[item.id] = '$ python3 solution.py\n💡 Nhập mã của bạn và bấm "Chạy thử" (giới hạn 5s)!';
        }
      }
      setCodeAnswers(initialCodes);
      setCodeOutputs(initialOutputs);
    } catch {
      setDailyError('Không thể nạp dữ liệu ôn tập hằng ngày.');
    } finally {
      setDailyLoading(false);
    }
  }, []);

  const dailyLoadedRef = useRef(false);
  useEffect(() => {
    if (activeScreen === 'practice' && !dailyLoadedRef.current) {
      dailyLoadedRef.current = true;
      void handleLoadDailySession();
    }
  }, [activeScreen, handleLoadDailySession]);

  const handleSelectQuizOption = useCallback(
    (item: DailyQuizItem, optIdx: number) => {
      const isResolved = quizResolved[item.id] ?? false;
      const isRethinking = quizRethinking[item.id] ?? false;
      const lockedOpt = quizLockedOption[item.id];

      if (isResolved) return;
      if (isRethinking && lockedOpt === optIdx) return;

      setQuizPicks((prev) => ({ ...prev, [item.id]: optIdx }));

      if (!isRethinking) {
        if (optIdx === item.correctIndex) {
          setQuizResolved((prev) => ({ ...prev, [item.id]: true }));
          setQuizFirstTryCorrect((prev) => ({ ...prev, [item.id]: true }));
          setXp((prev) => prev + 15);
        } else {
          setQuizRethinking((prev) => ({ ...prev, [item.id]: true }));
          setQuizLockedOption((prev) => ({ ...prev, [item.id]: optIdx }));
          setQuizFirstTryCorrect((prev) => ({ ...prev, [item.id]: false }));
        }
      } else {
        setQuizResolved((prev) => ({ ...prev, [item.id]: true }));
        setQuizRethinking((prev) => ({ ...prev, [item.id]: false }));
        if (optIdx === item.correctIndex) {
          setXp((prev) => prev + 10);
        }
      }
    },
    [quizResolved, quizRethinking, quizLockedOption],
  );

  const handleRunDailyCode = useCallback(
    async (item: DailyCodeItem, withTests = true) => {
      if (codeRunning) return;
      setCodeRunning(true);
      const t0 = performance.now();

      try {
        let runner = pyRunnerRef.current;
        if (!runner) {
          runner = new PyodideRunner();
          pyRunnerRef.current = runner;
        }

        const userCode = codeAnswers[item.id] ?? item.starterCode;
        const pyRes = await runner.run(
          {
            code: userCode,
            tests: withTests
              ? item.tests.map((t) => ({ name: t.name, call: t.call, expect: t.expected }))
              : [],
            forbid: [],
            files: [],
            packages: [],
          },
          (statusText) => {
            setCodeOutputs((prev) => ({
              ...prev,
              [item.id]: `$ python3 solution.py\n⏳ ${statusText}`,
            }));
          },
        );

        if (pyRes) {
          const outLines = ['$ python3 solution.py'];
          if (pyRes.output && pyRes.output.trim()) {
            outLines.push(pyRes.output.trimEnd());
          }
          if (pyRes.error && pyRes.error.trim()) {
            outLines.push(`⚠️ ${pyRes.error.trimEnd()}`);
          }
          if (!pyRes.output?.trim() && !pyRes.error?.trim()) {
            outLines.push('(Chương trình đã chạy xong, không có đầu ra in lên màn hình)');
          }
          const durSec = ((pyRes.duration || performance.now() - t0) / 1000).toFixed(2);
          outLines.push(`\n${pyRes.error ? '✗ Dừng do lỗi' : '✓ Đã chạy xong'} (${durSec}s).`);
          setCodeOutputs((prev) => ({ ...prev, [item.id]: outLines.join('\n') }));

          if (withTests && pyRes.tests) {
            setCodeTestResults((prev) => ({ ...prev, [item.id]: pyRes.tests }));
            const allPassed = pyRes.tests.length > 0 && pyRes.tests.every((t) => t.passed);
            if (allPassed && !codeSolved[item.id]) {
              setCodeSolved((prev) => ({ ...prev, [item.id]: true }));
              setXp((prev) => prev + 25);
            }
          }
        }
      } catch (err) {
        setCodeOutputs((prev) => ({
          ...prev,
          [item.id]: `$ python3 solution.py\n⚠️ Lỗi thực thi: ${err instanceof Error ? err.message : 'Không xác định'}`,
        }));
      } finally {
        setCodeRunning(false);
      }
    },
    [codeAnswers, codeRunning, codeSolved],
  );

  /* ==========================================================================
     CHIA NỘI DUNG BÀI HỌC THẬT THÀNH CÁC CẶP TRANG SÁCH MỞ (3 SPREADS = 6 TRANG)
     ========================================================================== */
  const TOTAL_SPREADS = 3; // Cặp 0 (Trang 1-2): Lý thuyết & Sơ đồ; Cặp 1 (Trang 3-4): Đọc hiểu & Trắc nghiệm; Cặp 2 (Trang 5-6): Lắp ghép & Thử thách

  const handleChangeLesson = useCallback(
    (nextIdx: number, targetSpread = 0) => {
      const clamped = Math.max(0, Math.min(CATALOG_LESSONS.length - 1, nextIdx));
      setLessonIdx(clamped);
      setSpreadIdx(targetSpread);
      if (typeof window !== 'undefined') {
        const url = `/lesson/${COURSE_ID}?lesson=${clamped}`;
        window.history.pushState(null, '', url);
      }
    },
    [setSpreadIdx],
  );

  const handlePrevSpread = () => {
    setFlipDir('prev');
    if (spreadIdx > 0) {
      setSpreadIdx((s) => s - 1);
    } else if (lessonIdx > 0) {
      handleChangeLesson(lessonIdx - 1, TOTAL_SPREADS - 1);
    }
  };

  const handleNextSpread = () => {
    setFlipDir('next');
    if (spreadIdx < TOTAL_SPREADS - 1) {
      setSpreadIdx((s) => s + 1);
    } else if (lessonIdx < CATALOG_LESSONS.length - 1) {
      handleChangeLesson(lessonIdx + 1, 0);
    } else {
      handleChangeLesson(0, 0);
    }
  };

  // Trích xuất dữ liệu từng phần từ `lessonContent` (StudioLesson)
  const step1 = lessonContent?.step_1;
  const step2 = lessonContent?.step_2;
  const step3 = lessonContent?.step_3;
  const step4 = lessonContent?.step_4;

  const theoryBlocks = useMemo(() => step1?.theory ?? [], [step1]);
  const mainFigure = useMemo(
    () => step1?.figure ?? theoryBlocks.find((b) => b.figure)?.figure ?? null,
    [step1, theoryBlocks],
  );
  const explainItems = useMemo(() => step1?.explain ?? [], [step1]);
  const mcqList = useMemo(() => step2?.mcq ?? [], [step2]);
  const codeLineCount = Math.max(12, ideCustomCode.split('\n').length);

  // Dữ liệu tính toán cho luồng Ôn tập hằng ngày
  const dailyItems = dailySession?.items ?? [];
  const currentDailyItem: DailyPracticeItem | undefined = dailyItems[dailyItemIdx];
  const quizItems = dailyItems.filter((i): i is DailyQuizItem => i.type === 'quiz');
  const codeItems = dailyItems.filter((i): i is DailyCodeItem => i.type === 'code');
  const quizzesFirstTryCount = quizItems.filter((i) => quizFirstTryCorrect[i.id]).length;
  const quizzesSecondTryCount = quizItems.filter(
    (i) => quizResolved[i.id] && !quizFirstTryCorrect[i.id] && quizPicks[i.id] === i.correctIndex,
  ).length;
  const codesCompletedCount = codeItems.filter((i) => codeSolved[i.id]).length;
  const totalDailyXpEarned =
    quizzesFirstTryCount * 15 + quizzesSecondTryCount * 10 + codesCompletedCount * 25;
  const answeredDailyCount =
    quizItems.filter((i) => quizResolved[i.id]).length + codesCompletedCount;

  const stageContent = (
    <>
        {activeScreen === 'lesson' && (
          /* ------------------------------------------------------------------
             TRANG 1: QUYỂN SÁCH BÀI HỌC MỞ 2 TRANG & LẬT TRANG 3D (48 BÀI THẬT)
             ------------------------------------------------------------------ */
          <div ref={shellRef} className={styles.bookStageWrap}>
            <div className={styles.openBookCover}>
              <div
                key={`lesson-${lessonIdx}-spread-${spreadIdx}`}
                className={`${styles.openBookSpread} ${
                  flipDir === 'next' ? styles.flipNextAnim : styles.flipPrevAnim
                }`}
              >
                {/* ================= TRANG BÊN TRÁI ================= */}
                <section className={`${styles.bookPage} ${styles.bookPageLeft}`}>
                  <div className={styles.pageHeaderLine}>
                    <select
                      aria-label="Chọn bài trong khoá"
                      className={styles.bookLessonSelect}
                      value={lessonIdx}
                      onChange={(e) => handleChangeLesson(Number(e.target.value), 0)}
                    >
                      {CATALOG_LESSONS.map((item, idx) => (
                        <option key={item.no} value={idx}>
                          {doneLessons.includes(item.no) ? '✓ ' : ''}
                          Bài {item.no}/48 · {item.code} · {item.title}
                        </option>
                      ))}
                    </select>
                    <span>
                      {spreadIdx === 0
                        ? 'LÝ THUYẾT'
                        : spreadIdx === 1
                          ? 'ĐỌC HIỂU'
                          : 'LẮP GHÉP MÃ'}
                    </span>
                  </div>

                  {lessonLoading ? (
                    <div className={styles.pageBodyFlow}>
                      <p className={styles.pageSectionLabel}>ĐANG MỞ SÁCH...</p>
                      <h2 className={styles.pageMainTitle}>
                        {currentCatalog.code} · {currentCatalog.title}
                      </h2>
                      <p className={styles.pageLeadParagraph}>
                        Đang tải nội dung bài từ máy chủ...
                      </p>
                    </div>
                  ) : lessonError ? (
                    <div className={styles.pageBodyFlow}>
                      <p className={styles.pageSectionLabel}>MÁY CHỦ BÀI HỌC</p>
                      <h2 className={styles.pageMainTitle}>Chưa kết nối được Backend</h2>
                      <p className={styles.pageLeadParagraph}>
                        Nội dung bài học {currentCatalog.code} cần được nạp trực tiếp từ máy chủ backend.
                      </p>
                      <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <p style={{ margin: 0, fontSize: 13.5, color: '#991b1b', lineHeight: 1.5 }}>
                          ⚠️ {lessonError}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLessonReloadKey((k) => k + 1)}
                        className={styles.spreadNextBtn}
                        style={{ marginTop: 18, width: 'fit-content', padding: '8px 20px', cursor: 'pointer' }}
                      >
                        ↻ Thử lại
                      </button>
                    </div>
                  ) : spreadIdx === 0 ? (
                    /* --- CẶP TRANG 1 (TRANG TRÁI): ĐỊNH NGHĨA & LÝ THUYẾT CỐT LÕI --- */
                    <div className={styles.pageBodyFlow}>
                      <p className={styles.pageSectionLabel}>
                        {currentCatalog.moduleTitle.toUpperCase()} · {currentCatalog.minutes} PHÚT
                      </p>
                      <h2 className={styles.pageMainTitle}>
                        {step1?.brief?.title || currentCatalog.title}
                      </h2>
                      <p className={styles.pageLeadParagraph}>
                        {step1?.brief?.goal ||
                          step1?.context?.body ||
                          theoryBlocks[0]?.body ||
                          'Nắm vững nguyên lý cốt lõi và cách vận dụng trực tiếp trong Python.'}
                      </p>

                      {theoryBlocks.length > 0 && (
                        <div className={styles.bookCardsGrid}>
                          {theoryBlocks.slice(0, 2).map((blk, i) => (
                            <div
                              key={i}
                              className={`${styles.bookConceptCard} ${
                                i === 1 ? styles.bookConceptCardHighlight : ''
                              }`}
                            >
                              <span className={styles.bookConceptTag}>
                                KHÁI NIỆM {i + 1} · {currentCatalog.code}
                              </span>
                              <div className={styles.bookConceptTitle}>{blk.title}</div>
                              <p className={styles.bookConceptDesc}>
                                {blk.body ||
                                  (blk.bullets ? blk.bullets.slice(0, 2).join(' • ') : '')}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {step1?.misconception ? (
                        <div className={styles.bookCalloutNote}>
                          <b>LƯU Ý DỄ NHẦM · {step1.misconception.title || 'CẦN NHỚ'}</b>
                          {step1.misconception.body}
                        </div>
                      ) : (
                        theoryBlocks[2] && (
                          <div className={styles.bookCalloutNote}>
                            <b>GHI CHÚ · {theoryBlocks[2].title}</b>
                            {theoryBlocks[2].body ||
                              (theoryBlocks[2].bullets ?? []).join(' • ')}
                          </div>
                        )
                      )}
                    </div>
                  ) : spreadIdx === 1 ? (
                    /* --- CẶP TRANG 2 (TRANG TRÁI): DỰ ĐOÁN & CÂU HỎI TRẮC NGHIỆM 1 --- */
                    <div className={styles.pageBodyFlow}>
                      <p className={styles.pageSectionLabel}>DỰ ĐOÁN KẾT QUẢ &amp; KIỂM TRA</p>
                      {step1?.predict ? (
                        <>
                          <h2 className={styles.pageMainTitle}>Câu hỏi dự đoán nhanh</h2>
                          <p className={styles.pageLeadParagraph}>{step1.predict.question}</p>
                          <div className={styles.paperOptList}>
                            {step1.predict.options.map((opt, oIdx) => {
                              const pKey = `${lessonNo}-predict`;
                              const chosen = pickedPredict[pKey];
                              const isAnswered = chosen !== undefined;
                              const isCorrect = Boolean(opt.correct);
                              let btnClass = styles.paperOptBtn;
                              if (isAnswered && chosen === oIdx) {
                                btnClass += isCorrect
                                  ? ` ${styles.paperOptCorrect}`
                                  : ` ${styles.paperOptWrong}`;
                              } else if (isAnswered && isCorrect) {
                                btnClass += ` ${styles.paperOptCorrect}`;
                              }
                              return (
                                <button
                                  key={opt.id || oIdx}
                                  type="button"
                                  className={btnClass}
                                  onClick={() =>
                                    setPickedPredict((prev) => ({ ...prev, [pKey]: oIdx }))
                                  }
                                >
                                  <span>
                                    <strong>{LETTERS[oIdx]}.</strong> {opt.title}
                                  </span>
                                  {isAnswered && isCorrect && <span>✓</span>}
                                </button>
                              );
                            })}
                          </div>
                          {pickedPredict[`${lessonNo}-predict`] !== undefined && (
                            <div className={styles.paperFeedback}>
                              {step1.predict.options[pickedPredict[`${lessonNo}-predict`]]
                                ?.detail || 'Quan sát kỹ sự khác biệt giữa các lần thực thi.'}
                            </div>
                          )}
                        </>
                      ) : null}

                      {mcqList[0] && (
                        <div style={{ marginTop: step1?.predict ? 6 : 0 }}>
                          <p className={styles.pageSectionLabel}>CÂU HỎI CỦNG CỐ #1</p>
                          <p
                            className={styles.pageLeadParagraph}
                            style={{ fontWeight: 700, marginBottom: 8 }}
                          >
                            {mcqList[0].question}
                          </p>
                          <div className={styles.paperOptList}>
                            {mcqList[0].options.map((rawOpt, oIdx) => {
                              const optText =
                                typeof rawOpt === 'string' ? rawOpt : rawOpt.text;
                              const correctIdx =
                                typeof mcqList[0].correct === 'number'
                                  ? mcqList[0].correct
                                  : mcqList[0].options.findIndex(
                                      (x) => typeof x === 'object' && x.correct,
                                    );
                              const mKey = `${lessonNo}-mcq-0`;
                              const chosen = pickedMcq[mKey];
                              const isAnswered = chosen !== undefined;
                              const isCorrect = oIdx === correctIdx;
                              let btnClass = styles.paperOptBtn;
                              if (isAnswered && chosen === oIdx) {
                                btnClass += isCorrect
                                  ? ` ${styles.paperOptCorrect}`
                                  : ` ${styles.paperOptWrong}`;
                              } else if (isAnswered && isCorrect) {
                                btnClass += ` ${styles.paperOptCorrect}`;
                              }
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  className={btnClass}
                                  onClick={() =>
                                    setPickedMcq((prev) => ({ ...prev, [mKey]: oIdx }))
                                  }
                                >
                                  <span>
                                    <strong>{LETTERS[oIdx]}.</strong> {optText}
                                  </span>
                                  {isAnswered && isCorrect && <span>✓</span>}
                                </button>
                              );
                            })}
                          </div>
                          {pickedMcq[`${lessonNo}-mcq-0`] !== undefined && (
                            <div className={styles.paperFeedback}>
                              {mcqList[0].explanation || 'Đáp án đúng theo nguyên lý trong bài.'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* --- CẶP TRANG 3 (TRANG TRÁI): LẮP GHÉP KHUNG MÃ & DẤU VẾT --- */
                    <div className={styles.pageBodyFlow}>
                      <p className={styles.pageSectionLabel}>LUYỆN LẮP GHÉP KHUNG MÃ</p>
                      <h2 className={styles.pageMainTitle}>
                        {step3?.task?.title || 'Điền khuyết khung chương trình'}
                      </h2>
                      <p className={styles.pageLeadParagraph}>
                        {step3?.task?.body ||
                          'Quan sát khung mã bên dưới và chọn mảnh ghép chính xác cho vị trí còn khuyết:'}
                      </p>

                      {step3?.scaffold ? (
                        <>
                          <div className={styles.bookCodeBox}>
                            {step3.scaffold.template
                              .trim()
                              .split('\n')
                              .slice(0, 14)
                              .map((line, lIdx) => (
                                <div key={lIdx}>{line}</div>
                              ))}
                          </div>

                          {step3.scaffold.slots[0] && (
                            <>
                              <p
                                className={styles.pageLeadParagraph}
                                style={{ fontWeight: 700, fontSize: 12.8 }}
                              >
                                Chọn mảnh ghép đúng cho <code>{'{{slot1}}'}</code>:
                              </p>
                              <div className={styles.paperOptList}>
                                {step3.scaffold.bank
                                  .filter((b) => b.slot === 1)
                                  .map((item, bIdx) => {
                                    const sKey = `${lessonNo}-slot-1`;
                                    const picked = pickedScaffold[sKey];
                                    const targetAns = step3.scaffold?.slots[0]?.answer;
                                    const isRight = item.label === targetAns;
                                    let btnClass = styles.paperOptBtn;
                                    if (picked !== undefined && picked === item.label) {
                                      btnClass += isRight
                                        ? ` ${styles.paperOptCorrect}`
                                        : ` ${styles.paperOptWrong}`;
                                    } else if (picked !== undefined && isRight) {
                                      btnClass += ` ${styles.paperOptCorrect}`;
                                    }
                                    return (
                                      <button
                                        key={bIdx}
                                        type="button"
                                        className={btnClass}
                                        onClick={() =>
                                          setPickedScaffold((prev) => ({
                                            ...prev,
                                            [sKey]: item.label,
                                          }))
                                        }
                                      >
                                        <code>{item.label}</code>
                                        {picked !== undefined && isRight && <span>✓ Đúng</span>}
                                      </button>
                                    );
                                  })}
                              </div>
                            </>
                          )}
                        </>
                      ) : null}

                      {step3?.counter && (
                        <div style={{ marginTop: 4 }}>
                          <p className={styles.pageSectionLabel}>KIỂM TRA NHANH ĐẦU RA</p>
                          <p className={styles.pageLeadParagraph} style={{ fontWeight: 600 }}>
                            {step3.counter.question}
                          </p>
                          <div className={styles.paperOptList}>
                            {step3.counter.options.map((opt, oIdx) => {
                              const cKey = `${lessonNo}-counter`;
                              const picked = pickedCounter[cKey];
                              const isRight = opt === step3.counter?.correct;
                              let btnClass = styles.paperOptBtn;
                              if (picked !== undefined && picked === opt) {
                                btnClass += isRight
                                  ? ` ${styles.paperOptCorrect}`
                                  : ` ${styles.paperOptWrong}`;
                              } else if (picked !== undefined && isRight) {
                                btnClass += ` ${styles.paperOptCorrect}`;
                              }
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  className={btnClass}
                                  onClick={() =>
                                    setPickedCounter((prev) => ({ ...prev, [cKey]: opt }))
                                  }
                                >
                                  <span>{opt}</span>
                                  {picked !== undefined && isRight && <span>✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={styles.pageFooterRow}>
                    <span>Trang {spreadIdx * 2 + 1}</span>
                    <span>
                      {isCurrentLessonDone
                        ? '✓ Bài này đã xong'
                        : `Đang mở · +${currentCatalog.xp} XP`}
                    </span>
                  </div>
                </section>

                {/* ================= TRANG BÊN PHẢI ================= */}
                <section className={`${styles.bookPage} ${styles.bookPageRight}`}>
                  <div className={styles.pageHeaderLine}>
                    <span>SỔ TAY NHÀ PHÁT MINH · {currentCatalog.moduleShort}</span>
                    <span>
                      {spreadIdx === 0
                        ? 'SƠ ĐỒ & VÍ DỤ'
                        : spreadIdx === 1
                          ? 'TRẮC NGHIỆM'
                          : `THỬ THÁCH +${currentCatalog.xp} XP`}
                    </span>
                  </div>

                  {lessonLoading ? (
                    <div className={styles.pageBodyFlow}>
                      <p className={styles.pageSectionLabel}>ĐANG TẢI...</p>
                      <p className={styles.pageLeadParagraph}>Đang kết nối tới máy chủ backend...</p>
                    </div>
                  ) : lessonError ? (
                    <div className={styles.pageBodyFlow}>
                      <p className={styles.pageSectionLabel}>HƯỚNG DẪN KẾT NỐI</p>
                      <h2 className={styles.pageMainTitle}>Khởi động Backend</h2>
                      <p className={styles.pageLeadParagraph}>
                        Để học các bài học và làm bài tập, hãy đảm bảo máy chủ backend đang chạy:
                      </p>
                      <div style={{ background: '#292524', color: '#f5f5f4', padding: '10px 14px', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, marginTop: 8 }}>
                        <code>npm run start:dev</code>
                      </div>
                      <p style={{ fontSize: 13, color: '#78716c', marginTop: 12, lineHeight: 1.5 }}>
                        Sau khi máy chủ NestJS sẵn sàng tại cổng 5000, bấm nút <strong>Thử lại</strong> ở trang đối diện để tải bài.
                      </p>
                    </div>
                  ) : spreadIdx === 0 ? (
                    /* --- CẶP TRANG 1 (TRANG PHẢI): SƠ ĐỒ MINH HOẠ SVG & CODE VÍ DỤ --- */
                    <div className={styles.pageBodyFlow}>
                      <p className={styles.pageSectionLabel}>SƠ ĐỒ TRỰC QUAN &amp; Ý CHÍNH</p>

                      {mainFigure ? (
                        <div className={styles.bookFigureBox}>
                          <img
                            className={styles.bookFigureImg}
                            src={mainFigure.src}
                            alt={mainFigure.alt || mainFigure.caption}
                          />
                          <span className={styles.bookFigureCaption}>{mainFigure.caption}</span>
                        </div>
                      ) : null}

                      {explainItems.length > 0 && (
                        <div className={styles.bookCalloutNote}>
                          <b>TÓM TẮT CỐT LÕI ({explainItems.length} Ý CHÍNH)</b>
                          {explainItems.slice(0, 3).map((item, idx) => (
                            <div key={idx} style={{ marginTop: idx > 0 ? 4 : 0 }}>
                              {item.n ?? idx + 1}. {item.body}
                            </div>
                          ))}
                        </div>
                      )}

                      {step1?.code?.source && (
                        <>
                          <div className={styles.bookCodeBox}>
                            {step1.code.source
                              .trim()
                              .split('\n')
                              .slice(0, 8)
                              .map((line, lIdx) => (
                                <div key={lIdx}>{line}</div>
                              ))}
                          </div>
                          <div className={styles.bookActionRow}>
                            <button
                              type="button"
                              className={styles.bookSecondaryBtn}
                              onClick={() => openCodeInIde(step1.code!.source)}
                            >
                              Chạy thử ví dụ ở Bàn thí nghiệm
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : spreadIdx === 1 ? (
                    /* --- CẶP TRANG 2 (TRANG PHẢI): CÂU HỎI TRẮC NGHIỆM 2 & 3 --- */
                    <div className={styles.pageBodyFlow}>
                      {mcqList.slice(1, 3).map((mcq, idx) => {
                        const realIdx = idx + 1;
                        const mKey = `${lessonNo}-mcq-${realIdx}`;
                        const chosen = pickedMcq[mKey];
                        const isAnswered = chosen !== undefined;
                        const correctIdx =
                          typeof mcq.correct === 'number'
                            ? mcq.correct
                            : mcq.options.findIndex((x) => typeof x === 'object' && x.correct);

                        return (
                          <div key={realIdx} style={{ marginBottom: 6 }}>
                            <p className={styles.pageSectionLabel}>
                              CÂU HỎI CỦNG CỐ #{realIdx + 1}
                            </p>
                            <p
                              className={styles.pageLeadParagraph}
                              style={{ fontWeight: 700, marginBottom: 7 }}
                            >
                              {mcq.question}
                            </p>
                            <div className={styles.paperOptList}>
                              {mcq.options.map((rawOpt, oIdx) => {
                                const optText =
                                  typeof rawOpt === 'string' ? rawOpt : rawOpt.text;
                                const isCorrect = oIdx === correctIdx;
                                let btnClass = styles.paperOptBtn;
                                if (isAnswered && chosen === oIdx) {
                                  btnClass += isCorrect
                                    ? ` ${styles.paperOptCorrect}`
                                    : ` ${styles.paperOptWrong}`;
                                } else if (isAnswered && isCorrect) {
                                  btnClass += ` ${styles.paperOptCorrect}`;
                                }
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    className={btnClass}
                                    onClick={() => {
                                      if (pickedMcq[mKey] === undefined && isCorrect) {
                                        setXp((x) => x + 15);
                                      }
                                      setPickedMcq((prev) => ({ ...prev, [mKey]: oIdx }));
                                    }}
                                  >
                                    <span>
                                      <strong>{LETTERS[oIdx]}.</strong> {optText}
                                    </span>
                                    {isAnswered && isCorrect && <span>✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                            {isAnswered && (
                              <div className={styles.paperFeedback} style={{ marginTop: 6 }}>
                                {mcq.explanation || 'Chính xác theo nội dung bài học.'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* --- CẶP TRANG 3 (TRANG PHẢI): THỬ THÁCH ĐỘC LẬP & LƯU TIẾN ĐỘ --- */
                    <div className={styles.pageBodyFlow}>
                      <p className={styles.pageSectionLabel}>THỬ THÁCH ĐỘC LẬP</p>
                      <h2 className={styles.pageMainTitle}>
                        {step4?.task?.title || `Thực hành bài ${currentCatalog.code}`}
                      </h2>
                      <p className={styles.pageLeadParagraph}>
                        {step4?.task?.body ||
                          step1?.brief?.task ||
                          'Áp dụng kiến thức vừa học để viết hàm xử lý trong Bàn thí nghiệm.'}
                      </p>

                      {step4?.task?.io && step4.task.io.length > 0 && (
                        <div className={styles.bookCalloutNote}>
                          <b>CA KIỂM THỬ MẪU (INPUT ➔ OUTPUT)</b>
                          {step4.task.io.slice(0, 3).map((io, idx) => (
                            <div key={idx}>
                              <code>{io.label}</code> ➔ <strong>{io.value}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      {step4?.starterCode && (
                        <div className={styles.bookCodeBox}>
                          {step4.starterCode
                            .trim()
                            .split('\n')
                            .slice(0, 10)
                            .map((line, lIdx) => (
                              <div key={lIdx}>{line}</div>
                            ))}
                        </div>
                      )}

                      <div className={styles.bookActionRow}>
                        {step4?.starterCode && (
                          <button
                            type="button"
                            className={styles.bookSecondaryBtn}
                            onClick={() => openCodeInIde(step4.starterCode!)}
                          >
                            Chạy thử ở Bàn thí nghiệm
                          </button>
                        )}

                        {step4?.hints && step4.hints.length > 0 && (
                          <button
                            type="button"
                            className={styles.bookSecondaryBtn}
                            onClick={() =>
                              setShowHints((prev) => ({
                                ...prev,
                                [lessonNo]: !prev[lessonNo],
                              }))
                            }
                          >
                            {showHints[lessonNo] ? 'Ẩn gợi ý' : '💡 Xem gợi ý'}
                          </button>
                        )}

                        {step4?.solutionCode && (
                          <button
                            type="button"
                            className={styles.bookSecondaryBtn}
                            onClick={() =>
                              setShowSolution((prev) => ({
                                ...prev,
                                [lessonNo]: !prev[lessonNo],
                              }))
                            }
                          >
                            {showSolution[lessonNo] ? 'Ẩn lời giải mẫu' : '📖 Xem lời giải mẫu'}
                          </button>
                        )}

                        <button
                          type="button"
                          className={`${styles.bookPrimaryBtn} ${
                            isCurrentLessonDone ? styles.bookPrimaryBtnDone : ''
                          }`}
                          onClick={() => void handleCompleteLesson()}
                        >
                          {isCurrentLessonDone
                            ? `✓ Bài ${lessonNo} đã xong`
                            : `✓ Đánh dấu bài ${lessonNo} đã xong (+${currentCatalog.xp} XP)`}
                        </button>
                      </div>

                      {showHints[lessonNo] && step4?.hints && (
                        <div className={styles.bookCalloutNote}>
                          <b>GỢI Ý CÁCH LÀM</b>
                          {step4.hints.map((h, idx) => (
                            <div key={idx} style={{ marginTop: idx > 0 ? 4 : 0 }}>
                              <strong>{h.title}:</strong> {h.body}
                            </div>
                          ))}
                        </div>
                      )}

                      {showSolution[lessonNo] && step4?.solutionCode && (
                        <div className={styles.bookCodeBox}>
                          {step4.solutionCode
                            .trim()
                            .split('\n')
                            .map((line, lIdx) => (
                              <div key={lIdx}>{line}</div>
                            ))}
                        </div>
                      )}

                      {completeBanner && (
                        <div className={styles.paperFeedback}>{completeBanner}</div>
                      )}
                    </div>
                  )}

                  <div className={styles.pageFooterRow}>
                    <span>
                      Bài {lessonNo} / {CATALOG_LESSONS.length} ({currentCatalog.code})
                    </span>
                    <span>Trang {spreadIdx * 2 + 2}</span>
                  </div>
                </section>
              </div>
            </div>

            {/* Thanh điều hướng dưới chân sách */}
            <div className={styles.bookBottomNav}>
              <button
                type="button"
                className={styles.bookNavPrevBtn}
                onClick={handlePrevSpread}
                disabled={lessonIdx === 0 && spreadIdx === 0}
              >
                &lt; Trang trước
              </button>

              <div className={styles.bookNavDotsWrap}>
                {Array.from({ length: TOTAL_SPREADS }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Cặp trang ${idx + 1}`}
                    onClick={() => {
                      setFlipDir(idx > spreadIdx ? 'next' : 'prev');
                      setSpreadIdx(idx);
                    }}
                    className={`${styles.bookNavDot} ${
                      spreadIdx === idx ? styles.bookNavDotActive : ''
                    }`}
                  />
                ))}
                <span>
                  {spreadIdx + 1} / {TOTAL_SPREADS}
                </span>
              </div>

              <button
                type="button"
                className={styles.bookNavNextBtn}
                onClick={handleNextSpread}
              >
                {spreadIdx === TOTAL_SPREADS - 1 ? 'Bài tiếp theo >' : 'Trang sau >'}
              </button>
            </div>
          </div>
        )}

        {activeScreen === 'ide' && (
          /* ------------------------------------------------------------------
             TRANG 2: BÀN THÍ NGHIỆM — MÀN HÌNH LAPTOP VS CODE (70% CODE / 30% KẾT QUẢ)
             ------------------------------------------------------------------ */
          <div ref={shellRef} className={styles.laptopScreenShell}>
            <div className={styles.laptopCameraNotch} aria-hidden="true" />

            <div className={styles.vscodeWindow}>
              <div className={styles.vscodeTitlebar}>
                <div className={styles.vscodeTitleLeft}>
                  <div className={styles.macTrafficLights} aria-hidden="true">
                    <span className={styles.macDotRed} />
                    <span className={styles.macDotYellow} />
                    <span className={styles.macDotGreen} />
                  </div>
                  <div className={styles.vscodeFileTab}>
                    <span>🐍</span>
                    <span>main.py</span>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.runActionBtn}
                  onClick={() => void handleRunIdeCode()}
                  disabled={ideRunning}
                >
                  <span aria-hidden="true">▶</span> {ideRunning ? 'Running...' : 'Run Code'}
                </button>
              </div>

              <div className={styles.ideWorkspace}>
                <section className={styles.ideEditorCenter}>
                  <div className={styles.lineNumbersGutter} aria-hidden="true">
                    {Array.from({ length: codeLineCount }).map((_, idx) => (
                      <div key={idx}>{idx + 1}</div>
                    ))}
                  </div>
                  <textarea
                    className={styles.ideTextarea}
                    value={ideCustomCode}
                    onChange={(e) => setIdeCustomCode(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        void handleRunIdeCode();
                      }
                    }}
                    onScroll={(e) => {
                      if (e.currentTarget.scrollLeft !== 0) {
                        e.currentTarget.scrollLeft = 0;
                      }
                    }}
                    placeholder="Nhập code Python của bạn tại đây..."
                    wrap="soft"
                    spellCheck={false}
                  />
                </section>

                <aside className={styles.ideOutputPane}>
                  <div className={styles.idePaneHeader}>
                    <span>TERMINAL · OUTPUT</span>
                  </div>

                  <div className={styles.terminalBox}>
                    <pre className={styles.terminalPre}>{ideOutput}</pre>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        )}

        {activeScreen === 'practice' && (
          /* ------------------------------------------------------------------
             TRANG 3: ÔN TẬP HẰNG NGÀY THEO FIGMA (XEN KẼ TRẮC NGHIỆM VÀ BÀI CODE)
             ------------------------------------------------------------------ */
          <div ref={shellRef} className={styles.bookStageWrap}>
            {/* Thanh tiến trình Stepper các câu trong lượt ôn hằng ngày */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(8px)',
                  padding: '5px 8px',
                  borderRadius: '14px',
                  border: '1px solid rgba(180, 150, 120, 0.35)',
                  boxShadow: '0 2px 10px rgba(60, 40, 20, 0.06)',
                  gap: '6px',
                  flexWrap: 'wrap',
                }}
              >
                {dailyItems.map((item, idx) => {
                  const isCurrent = !dailyFinished && dailyItemIdx === idx;
                  const isQuiz = item.type === 'quiz';
                  let statusBadge = `[${idx + 1}]`;
                  let badgeColor = '#78716c';

                  if (isQuiz) {
                    const isDone = quizResolved[item.id];
                    const isFirstTry = quizFirstTryCorrect[item.id];
                    const pick = quizPicks[item.id];
                    const isRight = isDone && pick === item.correctIndex;
                    if (isDone) {
                      statusBadge = isRight ? (isFirstTry ? '✓' : '✓ (lần 2)') : '✗';
                      badgeColor = isRight ? '#15803d' : '#b91c1c';
                    } else if (quizRethinking[item.id]) {
                      statusBadge = '↺';
                      badgeColor = '#b45309';
                    }
                  } else {
                    const isSolved = codeSolved[item.id];
                    if (isSolved) {
                      statusBadge = '✓';
                      badgeColor = '#15803d';
                    }
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setDailyFinished(false);
                        setDailyItemIdx(idx);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        border: isCurrent ? '1px solid #78350f' : '1px solid transparent',
                        transition: 'all 0.15s ease',
                        background: isCurrent ? '#78350f' : 'rgba(255, 255, 255, 0.6)',
                        color: isCurrent ? '#ffffff' : '#44403c',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span aria-hidden="true">{isQuiz ? '📝' : '💻'}</span>
                      <span>
                        Câu {idx + 1}: {isQuiz ? 'Trắc nghiệm' : 'Viết mã'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: isCurrent ? '#fef08a' : badgeColor,
                          fontWeight: 800,
                        }}
                      >
                        {statusBadge}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setDailyFinished(true)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    border: dailyFinished ? '1px solid #78350f' : '1px solid transparent',
                    background: dailyFinished ? '#78350f' : 'rgba(245, 245, 244, 0.8)',
                    color: dailyFinished ? '#ffffff' : '#78716c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span aria-hidden="true">🏆</span> Tổng kết lượt ôn
                </button>
              </div>
            </div>

            {dailyLoading ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <p style={{ fontWeight: 700, color: '#78716c', fontSize: 16 }}>
                  ⏳ Đang nạp phiên ôn tập hằng ngày...
                </p>
              </div>
            ) : dailyError ? (
              <div
                style={{
                  maxWidth: 520,
                  margin: '40px auto',
                  padding: '24px',
                  background: '#fffdfa',
                  borderRadius: 12,
                  border: '1px solid #fecaca',
                  textAlign: 'center',
                }}
              >
                <h3 style={{ margin: '0 0 10px 0', color: '#b91c1c', fontSize: 16 }}>
                  Thông báo ôn tập hằng ngày
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#44403c' }}>
                  {dailyError}
                </p>
                <button
                  type="button"
                  className={styles.freshDeckBtn}
                  onClick={() => void handleLoadDailySession()}
                >
                  ↻ Thử nạp lại
                </button>
              </div>
            ) : dailyFinished ? (
              /* ================= MÀN HÌNH TỔNG KẾT LƯỢT ÔN TẬP HẰNG NGÀY ================= */
              <div className={styles.openBookCover}>
                <div className={`${styles.openBookSpread} ${styles.flipNextAnim}`}>
                  {/* Trang trái: Bảng thống kê kết quả */}
                  <section className={`${styles.bookPage} ${styles.bookPageLeft}`}>
                    <div className={styles.pageHeaderLine}>
                      <span>SỔ TAY ÔN TẬP · TỔNG KẾT HẰNG NGÀY</span>
                      <span>KẾT QUẢ LƯỢT ÔN</span>
                    </div>

                    <div className={styles.pageBodyFlow}>
                      <p className={styles.pageSectionLabel}>HOÀN THÀNH LƯỢT ÔN</p>
                      <h2 className={styles.pageMainTitle}>Tổng kết phiên học</h2>
                      <p className={styles.pageLeadParagraph}>
                        Bạn đã đi qua toàn bộ các câu hỏi trắc nghiệm và bài tập viết mã của phiên
                        hôm nay. Dưới đây là kết quả chi tiết:
                      </p>

                      <div className={styles.studyLogSheet} style={{ marginTop: 14 }}>
                        <div className={styles.studyLogTitle}>
                          <span>📊 KẾT QUẢ ĐẠT ĐƯỢC</span>
                          <span>+{totalDailyXpEarned} XP</span>
                        </div>
                        <ul className={styles.studyLogList}>
                          <li className={styles.studyLogItem}>
                            <span>Trắc nghiệm đúng ngay lần đầu</span>
                            <strong>
                              {quizzesFirstTryCount} / {quizItems.length} câu (+
                              {quizzesFirstTryCount * 15} XP)
                            </strong>
                          </li>
                          <li className={styles.studyLogItem}>
                            <span>Trắc nghiệm đúng sau lần nghĩ lại</span>
                            <strong>
                              {quizzesSecondTryCount} / {quizItems.length} câu (+
                              {quizzesSecondTryCount * 10} XP)
                            </strong>
                          </li>
                          <li className={styles.studyLogItem}>
                            <span>Bài tập viết mã vượt qua toàn bộ ca kiểm thử</span>
                            <strong>
                              {codesCompletedCount} / {codeItems.length} bài (+
                              {codesCompletedCount * 25} XP)
                            </strong>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className={styles.pageFooterRow}>
                      <span>1</span>
                      <span>Ôn tập hằng ngày</span>
                    </div>
                  </section>

                  {/* Trang phải: Chi tiết từng câu và nút hành động */}
                  <section className={`${styles.bookPage} ${styles.bookPageRight}`}>
                    <div className={styles.pageHeaderLine}>
                      <span>DANH SÁCH BÀI LÀM</span>
                      <span>{answeredDailyCount} / {dailyItems.length} CÂU ĐÃ LÀM</span>
                    </div>

                    <div className={styles.pageBodyFlow}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {dailyItems.map((item, idx) => {
                          const isQuiz = item.type === 'quiz';
                          let isPass = false;
                          let textSummary = '';
                          if (isQuiz) {
                            const isDone = quizResolved[item.id];
                            const isRight = isDone && quizPicks[item.id] === item.correctIndex;
                            isPass = Boolean(isRight);
                            textSummary = isRight
                              ? quizFirstTryCorrect[item.id]
                                ? 'Đúng ngay lần đầu'
                                : 'Đúng sau lần nghĩ lại'
                              : isDone
                                ? 'Chưa chính xác'
                                : 'Chưa trả lời';
                          } else {
                            isPass = Boolean(codeSolved[item.id]);
                            textSummary = isPass
                              ? 'Đã vượt qua toàn bộ ca kiểm thử'
                              : 'Chưa đạt toàn bộ ca kiểm thử';
                          }

                          return (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                background: '#ffffff',
                                borderRadius: 8,
                                border: '1px solid rgba(180, 150, 120, 0.25)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span aria-hidden="true">{isQuiz ? '📝' : '💻'}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#292524' }}>
                                  Câu {idx + 1}: {item.type === 'code' ? item.title : item.lesson_title}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: isPass ? '#15803d' : '#b45309',
                                }}
                              >
                                {isPass ? '✓' : '•'} {textSummary}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div
                        style={{
                          marginTop: 20,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <button
                          type="button"
                          className={styles.freshDeckBtn}
                          onClick={() => void handleLoadDailySession()}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          ↻ Làm lại lượt ôn từ đầu
                        </button>
                        <button
                          type="button"
                          className={styles.freshDeckBtn}
                          onClick={() => {
                            setDailyFinished(false);
                            setDailyItemIdx(0);
                          }}
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            background: '#f5f5f4',
                            color: '#44403c',
                          }}
                        >
                          👁️ Xem lại các câu vừa làm
                        </button>
                        <button
                          type="button"
                          className={styles.freshDeckBtn}
                          onClick={() => switchScreen('lesson')}
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            background: '#fef3c7',
                            color: '#92400e',
                          }}
                        >
                          🛋️ Về Bàn học
                        </button>
                      </div>
                    </div>

                    <div className={styles.pageFooterRow}>
                      <span>Sổ tay ghi chép</span>
                      <span>2</span>
                    </div>
                  </section>
                </div>
              </div>
            ) : currentDailyItem?.type === 'quiz' ? (
              /* ================= CÂU HỎI TRẮC NGHIỆM ================= */
              (() => {
                const quizItem = currentDailyItem;
                const isResolved = quizResolved[quizItem.id] ?? false;
                const isRethinking = quizRethinking[quizItem.id] ?? false;
                const lockedOpt = quizLockedOption[quizItem.id];
                const picked = quizPicks[quizItem.id];
                const isFirstTry = quizFirstTryCorrect[quizItem.id] ?? false;
                const visCorrectIdx = visibleCorrectIndex(quizItem, isResolved);
                const visExplanation = visibleExplanation(quizItem, isResolved);

                return (
                  <>
                    <div className={styles.openBookCover}>
                      <div
                        key={`daily-quiz-${quizItem.id}`}
                        className={`${styles.openBookSpread} ${styles.flipNextAnim}`}
                      >
                        {/* Trang bên trái: Đề bài trắc nghiệm và phương án */}
                        <section className={`${styles.bookPage} ${styles.bookPageLeft}`}>
                          <div className={styles.pageHeaderLine}>
                            <span>SỔ TAY GIẤY NHỚ · ÔN TẬP HẰNG NGÀY</span>
                            <span>
                              CÂU {dailyItemIdx + 1} / {dailyItems.length} · TRẮC NGHIỆM
                            </span>
                          </div>

                          <div className={styles.pageBodyFlow}>
                            <div
                              className={styles.stickyQuestionNote}
                              style={{ backgroundColor: STICKY_COLORS[dailyItemIdx % STICKY_COLORS.length] }}
                            >
                              <div className={styles.washiTape} />
                              <div className={styles.stickyNoteMeta}>
                                <span>📝 CÂU HỎI TRẮC NGHIỆM</span>
                                <span>{quizItem.lesson_title}</span>
                              </div>

                              <div className={styles.stickyQuestionText}>
                                {quizItem.question}
                              </div>

                              <div className={styles.stickyOptList}>
                                {quizItem.options.map((opt, oIdx) => {
                                  const isThisPicked = picked === oIdx;
                                  const isCorrectAns = visCorrectIdx !== null && oIdx === visCorrectIdx;
                                  const isOptionLocked = isRethinking && lockedOpt === oIdx;

                                  let optStateClass = '';
                                  if (isResolved) {
                                    if (isCorrectAns) {
                                      optStateClass = styles.stickyOptCorrect;
                                    } else if (isThisPicked) {
                                      optStateClass = styles.stickyOptWrong;
                                    }
                                  }

                                  return (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      disabled={isResolved || isOptionLocked}
                                      className={`${styles.stickyOptBtn} ${optStateClass}`}
                                      onClick={() => handleSelectQuizOption(quizItem, oIdx)}
                                      style={{
                                        opacity: isOptionLocked ? 0.45 : 1,
                                        cursor: isResolved || isOptionLocked ? 'default' : 'pointer',
                                      }}
                                    >
                                      <span>{opt}</span>
                                      {isResolved && isCorrectAns && <span>✓ Đúng</span>}
                                      {isResolved && isThisPicked && !isCorrectAns && (
                                        <span>✗ Chưa đúng</span>
                                      )}
                                      {isOptionLocked && (
                                        <span style={{ fontSize: 11, color: '#b45309' }}>
                                          (Đã thử - sai)
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div style={{ marginTop: 12 }}>
                              {isRethinking ? (
                                <div
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    background: 'rgba(245, 158, 11, 0.12)',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    fontSize: 13,
                                    color: '#92400e',
                                    lineHeight: 1.5,
                                  }}
                                >
                                  💡 <strong>Chưa chính xác ở lần đầu:</strong> Đáp án đang được giữ
                                  kín. Bạn được nghĩ lại và chọn một phương án khác một lần nữa!
                                </div>
                              ) : isResolved ? (
                                <div
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    background:
                                      picked === quizItem.correctIndex
                                        ? 'rgba(34, 197, 94, 0.12)'
                                        : 'rgba(239, 68, 68, 0.1)',
                                    border: `1px solid ${
                                      picked === quizItem.correctIndex
                                        ? 'rgba(34, 197, 94, 0.35)'
                                        : 'rgba(239, 68, 68, 0.3)'
                                    }`,
                                    fontSize: 13,
                                    color:
                                      picked === quizItem.correctIndex ? '#15803d' : '#991b1b',
                                    lineHeight: 1.5,
                                  }}
                                >
                                  ✓ Đã chốt câu trả lời. Xem chi tiết giải thích và ghi chú ở trang
                                  bên phải.
                                </div>
                              ) : (
                                <p style={{ fontSize: 13, color: '#78716c', margin: 0 }}>
                                  Chọn một phương án bạn cho là chính xác nhất.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className={styles.pageFooterRow}>
                            <span>1</span>
                            <span>Trắc nghiệm hằng ngày</span>
                          </div>
                        </section>

                        {/* Trang bên phải: Ghi chú lời giải & Mẹo ghi nhớ */}
                        <section className={`${styles.bookPage} ${styles.bookPageRight}`}>
                          <div className={styles.pageHeaderLine}>
                            <span>GHI CHÚ LỜI GIẢI &amp; PHÂN TÍCH</span>
                            <span>
                              {isResolved
                                ? 'ĐÃ CHỐT'
                                : isRethinking
                                  ? 'LƯỢT NGHĨ LẠI'
                                  : 'CHỜ TRẢ LỜI'}
                            </span>
                          </div>

                          <div className={styles.pageBodyFlow}>
                            <div
                              className={`${styles.stickyExplainNote} ${
                                isResolved ? styles.stickyExplainNoteSolved : ''
                              }`}
                            >
                              <div className={styles.paperclipBadge}>📎 Ghim lời giải</div>

                              {!isResolved ? (
                                <div style={{ padding: '14px 4px' }}>
                                  <div
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 800,
                                      color: '#6b5310',
                                      marginBottom: 8,
                                    }}
                                  >
                                    ✍️ Tờ lời giải đang chờ bạn chọn đáp án
                                  </div>
                                  <p
                                    style={{
                                      fontSize: 13.5,
                                      lineHeight: 1.6,
                                      color: '#5a4d41',
                                      margin: 0,
                                    }}
                                  >
                                    Chọn một phương án trả lời ở tờ giấy nhớ bên trang trái. Ngay sau
                                    khi hoàn thành câu hỏi, lời giải chi tiết và phân tích của bài sẽ
                                    hiển thị tại đây!
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <div
                                    style={{
                                      fontSize: 13.5,
                                      fontWeight: 800,
                                      color:
                                        picked === quizItem.correctIndex ? '#15803d' : '#b45309',
                                      marginBottom: 8,
                                    }}
                                  >
                                    {picked === quizItem.correctIndex
                                      ? isFirstTry
                                        ? '🎉 Chính xác ngay lần đầu! (+15 XP)'
                                        : '✓ Chính xác sau lần nghĩ lại! (+10 XP)'
                                      : '💡 Chưa chính xác — Cùng xem lại giải thích chi tiết:'}
                                  </div>
                                  <p
                                    style={{
                                      fontSize: 13.5,
                                      lineHeight: 1.6,
                                      color: '#2c221a',
                                      margin: 0,
                                    }}
                                  >
                                    {visExplanation}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Điều hướng chuyển câu sau khi làm xong */}
                            <div
                              style={{
                                marginTop: 24,
                                padding: '14px 16px',
                                background: '#fdfbf7',
                                borderRadius: 10,
                                border: '1px solid rgba(180, 150, 120, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span style={{ fontSize: 13, color: '#57534e', fontWeight: 600 }}>
                                Tiến độ: {answeredDailyCount} / {dailyItems.length} câu
                              </span>
                              {dailyItemIdx < dailyItems.length - 1 ? (
                                <button
                                  type="button"
                                  className={styles.freshDeckBtn}
                                  onClick={() => setDailyItemIdx((i) => i + 1)}
                                >
                                  Tiếp tục sang câu tiếp theo ➔
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.freshDeckBtn}
                                  style={{ background: '#78350f', color: '#ffffff' }}
                                  onClick={() => setDailyFinished(true)}
                                >
                                  Xem tổng kết lượt ôn 🏆
                                </button>
                              )}
                            </div>
                          </div>

                          <div className={styles.pageFooterRow}>
                            <span>Sổ tay ghi chép</span>
                            <span>2</span>
                          </div>
                        </section>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : currentDailyItem?.type === 'code' ? (
              /* ================= BÀI TẬP VIẾT MÃ PYTHON ================= */
              (() => {
                const codeItem = currentDailyItem;
                const isSolved = Boolean(codeSolved[codeItem.id]);
                const testResults = codeTestResults[codeItem.id] ?? [];
                const hintsOpen = Boolean(codeHintsOpen[codeItem.id]);

                return (
                  <>
                    <div className={styles.openBookCover}>
                      <div
                        key={`daily-code-${codeItem.id}`}
                        className={`${styles.openBookSpread} ${styles.flipNextAnim}`}
                      >
                        {/* Trang bên trái: Đề bài, ví dụ kiểm thử và gợi ý */}
                        <section className={`${styles.bookPage} ${styles.bookPageLeft}`}>
                          <div className={styles.pageHeaderLine}>
                            <span>SỔ TAY THỰC HÀNH · BÀI CODE HẰNG NGÀY</span>
                            <span>
                              CÂU {dailyItemIdx + 1} / {dailyItems.length} · BÀI TẬP CODE
                            </span>
                          </div>

                          <div className={styles.pageBodyFlow}>
                            <div
                              style={{
                                background: '#fffdfa',
                                padding: '16px 18px',
                                borderRadius: 10,
                                border: '1px solid rgba(180, 150, 120, 0.3)',
                                boxShadow: '0 2px 6px rgba(60, 40, 20, 0.06)',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  letterSpacing: '0.05em',
                                  color: '#a16207',
                                  marginBottom: 6,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {codeItem.lesson_title}
                              </div>
                              <h3
                                style={{
                                  margin: '0 0 10px 0',
                                  fontSize: 16,
                                  fontWeight: 800,
                                  color: '#292524',
                                }}
                              >
                                {codeItem.title}
                              </h3>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 13.5,
                                  lineHeight: 1.65,
                                  color: '#44403c',
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {codeItem.description}
                              </p>
                            </div>

                            {/* Ví dụ kiểm thử mẫu */}
                            {codeItem.tests && codeItem.tests.length > 0 && (
                              <div
                                style={{
                                  marginTop: 12,
                                  background: '#f8fafc',
                                  padding: '12px 14px',
                                  borderRadius: 8,
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    color: '#475569',
                                    marginBottom: 6,
                                  }}
                                >
                                  CÁC CA KIỂM THỬ MẪU (TEST CASES):
                                </div>
                                {codeItem.tests.slice(0, 3).map((t, tIdx) => (
                                  <div
                                    key={tIdx}
                                    style={{
                                      fontSize: 12.5,
                                      fontFamily: 'monospace',
                                      color: '#1e293b',
                                      marginBottom: 4,
                                    }}
                                  >
                                    <strong>{t.name}:</strong> <code>{t.call}</code> ➔{' '}
                                    <code>{JSON.stringify(t.expected)}</code>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Khung gợi ý có thể đóng / mở */}
                            {codeItem.hints && codeItem.hints.length > 0 && (
                              <div
                                style={{
                                  marginTop: 12,
                                  background: '#fefce8',
                                  border: '1px solid #fef08a',
                                  borderRadius: 8,
                                  padding: '10px 14px',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCodeHintsOpen((prev) => ({
                                      ...prev,
                                      [codeItem.id]: !hintsOpen,
                                    }))
                                  }
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    fontFamily: 'inherit',
                                    fontWeight: 700,
                                    fontSize: 12.5,
                                    color: '#854d0e',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <span aria-hidden="true">💡</span>{' '}
                                  {hintsOpen ? 'Đóng gợi ý' : 'Mở gợi ý giải bài'}
                                </button>
                                {hintsOpen && (
                                  <div
                                    style={{
                                      marginTop: 8,
                                      fontSize: 12.5,
                                      lineHeight: 1.55,
                                      color: '#713f12',
                                    }}
                                  >
                                    {codeItem.hints.map((h, hIdx) => (
                                      <div key={hIdx} style={{ marginBottom: 4 }}>
                                        {h.title ? <strong>{h.title}: </strong> : null}
                                        <span>{h.body}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div style={{ marginTop: 12 }}>
                              {isSolved ? (
                                <div
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    background: 'rgba(34, 197, 94, 0.12)',
                                    border: '1px solid rgba(34, 197, 94, 0.35)',
                                    fontSize: 13,
                                    color: '#15803d',
                                    lineHeight: 1.5,
                                  }}
                                >
                                  ✓ Đã vượt qua toàn bộ ca kiểm thử (+25 XP)!
                                </div>
                              ) : (
                                <p style={{ fontSize: 13, color: '#78716c', margin: 0 }}>
                                  Nhập giải pháp của bạn ở trang bên phải và bấm &quot;Nộp để kiểm&quot;.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className={styles.pageFooterRow}>
                            <span>1</span>
                            <span>Viết mã hằng ngày</span>
                          </div>
                        </section>

                        {/* Trang bên phải: Trình soạn thảo mã và Chạy Pyodide */}
                        <section className={`${styles.bookPage} ${styles.bookPageRight}`}>
                          <div className={styles.pageHeaderLine}>
                            <span>BÀN GÕ MÃ VÀ KẾT QUẢ CHẠY (PYODIDE)</span>
                            <span>{isSolved ? '✓ ĐÃ ĐẠT (+25 XP)' : 'CHƯA NỘP'}</span>
                          </div>

                          <div className={styles.pageBodyFlow}>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  background: '#090d15',
                                  borderRadius: 10,
                                  border: '1px solid #222b3d',
                                  overflow: 'hidden',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                {/* Thanh công cụ IDE */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 14px',
                                    background: '#111726',
                                    borderBottom: '1px solid #222b3d',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontFamily: 'monospace',
                                      fontWeight: 700,
                                      color: '#93c5fd',
                                    }}
                                  >
                                    solution.py
                                  </span>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                      type="button"
                                      onClick={() => void handleRunDailyCode(codeItem, false)}
                                      disabled={codeRunning}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '5px 12px',
                                        borderRadius: 6,
                                        border: '1px solid #334155',
                                        background: '#1e293b',
                                        color: '#f8fafc',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: codeRunning ? 'not-allowed' : 'pointer',
                                      }}
                                    >
                                      <span aria-hidden="true">▶</span>{' '}
                                      {codeRunning ? 'Đang chạy...' : 'Chạy thử'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleRunDailyCode(codeItem, true)}
                                      disabled={codeRunning}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '5px 14px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: '#16a34a',
                                        color: '#ffffff',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: codeRunning ? 'not-allowed' : 'pointer',
                                      }}
                                    >
                                      <span aria-hidden="true">✓</span>{' '}
                                      {codeRunning ? 'Đang kiểm...' : 'Nộp để kiểm'}
                                    </button>
                                  </div>
                                </div>

                                {/* Textarea soạn thảo mã */}
                                <textarea
                                  value={codeAnswers[codeItem.id] ?? codeItem.starterCode}
                                  onChange={(e) =>
                                    setCodeAnswers((prev) => ({
                                      ...prev,
                                      [codeItem.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                      e.preventDefault();
                                      void handleRunDailyCode(codeItem, true);
                                    }
                                  }}
                                  spellCheck={false}
                                  className={styles.ideTextarea}
                                  style={{
                                    height: '180px',
                                    background: '#090d15',
                                    color: '#e2e8f0',
                                    border: 'none',
                                    fontSize: '13px',
                                  }}
                                />

                                {/* Cửa sổ Terminal kết quả chạy */}
                                <div
                                  style={{
                                    borderTop: '1px solid #222b3d',
                                    background: '#050811',
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: '5px 14px',
                                      background: '#0d131f',
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      color: '#8b9bb4',
                                      letterSpacing: '0.06em',
                                    }}
                                  >
                                    TERMINAL · OUTPUT (GIỚI HẠN 5 GIÂY)
                                  </div>
                                  <div className={styles.terminalBox} style={{ height: '110px' }}>
                                    <pre className={styles.terminalPre}>
                                      {codeOutputs[codeItem.id] ??
                                        '$ python3 solution.py\n💡 Nhập mã và bấm "Chạy thử" hoặc "Nộp để kiểm".'}
                                    </pre>
                                  </div>
                                </div>
                              </div>

                              {/* Bảng kết quả từng ca kiểm thử */}
                              {testResults.length > 0 && (
                                <div
                                  style={{
                                    background: '#ffffff',
                                    borderRadius: 8,
                                    border: '1px solid #e2e8f0',
                                    padding: '10px 14px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 11.5,
                                      fontWeight: 700,
                                      color: '#334155',
                                      marginBottom: 6,
                                    }}
                                  >
                                    KẾT QUẢ CÁC CA KIỂM THỬ:
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    {testResults.map((t, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '5px 10px',
                                          borderRadius: 6,
                                          fontSize: 12,
                                          background: t.passed
                                            ? 'rgba(34, 197, 94, 0.1)'
                                            : 'rgba(239, 68, 68, 0.1)',
                                          color: t.passed ? '#15803d' : '#b91c1c',
                                        }}
                                      >
                                        <span>
                                          <span aria-hidden="true">{t.passed ? '✓' : '✗'}</span>{' '}
                                          {t.name}
                                        </span>
                                        <span style={{ fontWeight: 700 }}>
                                          {t.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Nút chuyển câu tiếp theo */}
                              <div
                                style={{
                                  marginTop: 10,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <span style={{ fontSize: 13, color: '#57534e', fontWeight: 600 }}>
                                  Tiến độ: {answeredDailyCount} / {dailyItems.length} câu
                                </span>
                                {dailyItemIdx < dailyItems.length - 1 ? (
                                  <button
                                    type="button"
                                    className={styles.freshDeckBtn}
                                    onClick={() => setDailyItemIdx((i) => i + 1)}
                                  >
                                    Tiếp tục sang câu tiếp theo ➔
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className={styles.freshDeckBtn}
                                    style={{ background: '#78350f', color: '#ffffff' }}
                                    onClick={() => setDailyFinished(true)}
                                  >
                                    Xem tổng kết lượt ôn 🏆
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className={styles.pageFooterRow}>
                            <span>Sổ tay thực hành</span>
                            <span>2</span>
                          </div>
                        </section>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : null}

            {/* Thanh điều hướng chân trang */}
            {!dailyFinished && dailyItems.length > 0 && (
              <div className={styles.bookBottomNav}>
                <button
                  type="button"
                  className={styles.bookNavPrevBtn}
                  disabled={dailyItemIdx === 0}
                  onClick={() => setDailyItemIdx((i) => Math.max(0, i - 1))}
                >
                  &lt; Câu trước
                </button>

                <div className={styles.bookNavDotsWrap}>
                  {dailyItems.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`Câu ${idx + 1}`}
                      onClick={() => setDailyItemIdx(idx)}
                      className={`${styles.bookNavDot} ${
                        dailyItemIdx === idx ? styles.bookNavDotActive : ''
                      }`}
                    />
                  ))}
                  <span>
                    Câu {dailyItemIdx + 1} / {dailyItems.length}
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.bookNavNextBtn}
                  onClick={() => {
                    if (dailyItemIdx < dailyItems.length - 1) {
                      setDailyItemIdx((i) => i + 1);
                    } else {
                      setDailyFinished(true);
                    }
                  }}
                >
                  {dailyItemIdx < dailyItems.length - 1 ? 'Câu tiếp theo >' : 'Tổng kết >'}
                </button>
              </div>
            )}
          </div>
        )}
    </>
  );

  if (embedded) {
    return <div className={styles.embeddedStage}>{stageContent}</div>;
  }

  return (
    <div className={styles.appRoot} onPointerMove={handlePointerMove}>
      {/* ====================================================================
          1. BACKGROUND PHÒNG HỌC GIỐNG HỆT TRANG GÓC HỌC (shell.js & scene.css)
          ==================================================================== */}
      <div className={styles.cam}>
        <div
          className={styles.room}
          style={{
            transform: `translate(${roomLayout.ox}px, ${roomLayout.oy}px) scale(${roomLayout.scale})`,
            translate: `${parallax.x}px ${parallax.y}px`,
          }}
        >
          <img
            className={styles.roomImg}
            src="/goc-hoc/room.webp"
            alt="Không gian Góc học"
          />

          <div className={styles.itemsLayer}>
            {ALL_META_ENTRIES.filter(([k]) => k !== 'laptop').map(([k, [x, y, w, h]]) => (
              <div
                key={k}
                className={styles.itemObj}
                style={{ left: x, top: y, width: w, height: h }}
              >
                <img src={`/goc-hoc/items/${k}.webp`} alt="" />
              </div>
            ))}
          </div>

          <div className={styles.skyWrap} aria-hidden="true">
            <div className={styles.skyGrad} />
            <div className={styles.starsWrap}>
              {STARS_POS.map(([sx, sy, dl], idx) => (
                <i
                  key={idx}
                  className={styles.star}
                  style={{ left: sx, top: sy, animationDelay: `${dl}s` }}
                />
              ))}
            </div>
            <div className={`${styles.cloudLayer} ${styles.cloudBody}`} />
            <div className={`${styles.cloudLayer} ${styles.cloudLight}`} />
          </div>

          <div className={styles.winWrap} aria-hidden="true">
            <div className={`${styles.sash} ${styles.sashL}`}>
              <div className={styles.sashTex} />
              <div className={styles.paneGlass} style={{ left: 11, top: 2, width: 368, height: 277 }} />
              <div className={styles.paneGlass} style={{ left: 11, top: 297, width: 368, height: 316 }} />
              <div className={styles.paneGlass} style={{ left: 11, top: 631, width: 368, height: 297 }} />
            </div>
            <div className={`${styles.sash} ${styles.sashR}`}>
              <div className={styles.sashTex} />
              <div className={styles.paneGlass} style={{ left: 23, top: 2, width: 372, height: 277 }} />
              <div className={styles.paneGlass} style={{ left: 23, top: 297, width: 372, height: 316 }} />
              <div className={styles.paneGlass} style={{ left: 23, top: 631, width: 372, height: 297 }} />
            </div>
          </div>

          <img className={styles.swagImg} src="/goc-hoc/swag.png" alt="" />

          <div className={styles.itemsTopLayer}>
            <div
              className={styles.itemObj}
              style={{
                left: DATA.meta.laptop[0],
                top: DATA.meta.laptop[1],
                width: DATA.meta.laptop[2],
                height: DATA.meta.laptop[3],
              }}
            >
              <img src="/goc-hoc/items/laptop.webp" alt="" />
            </div>
          </div>

          <img className={styles.frontImg} src="/goc-hoc/front.webp" alt="" />

          {CITY_LIGHTS.map(([cx, cy, cw, ch], idx) => (
            <div
              key={idx}
              className={styles.cityLight}
              style={{
                left: cx - cw / 2,
                top: cy - ch / 2,
                width: cw,
                height: ch,
                animationDelay: `${-idx * 2.3}s`,
              }}
            />
          ))}

          <div className={styles.steamGroup}>
            <div className={styles.wisp} style={{ left: -36, animationDelay: '0s' }} />
            <div className={styles.wisp} style={{ left: -22, animationDelay: '1.4s' }} />
            <div className={styles.wisp} style={{ left: -36, animationDelay: '2.8s' }} />
            <div className={styles.wisp} style={{ left: -22, animationDelay: '4.2s' }} />
          </div>

          {DUST_MOTES.map(([mx, my, dl], idx) => (
            <div
              key={idx}
              className={styles.mote}
              style={{ left: mx, top: my, animationDelay: `${dl}s` }}
            />
          ))}

          <div className={styles.lampPool} />
          <div className={styles.lampHalo} />
          {BULBS.map(([bx, by], idx) => (
            <div key={idx} className={styles.bulb} style={{ left: bx, top: by }}>
              <i style={{ animationDelay: `${-(idx % 7) * 0.45}s` }} />
            </div>
          ))}

          <img className={styles.blurFull} src="/goc-hoc/room-blur.webp" alt="" />

          <div className={styles.glowsLayer}>
            {ALL_META_ENTRIES.map(([k, [x, y, w, h]]) => (
              <div
                key={k}
                className={styles.glowObj}
                style={{ left: x, top: y, width: w, height: h }}
              >
                <img src={`/goc-hoc/items/${k}-g.webp`} alt="" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.scrim} />

      {/* ====================================================================
          2. THANH CÔNG CỤ TRÊN CÙNG GIỐNG Y HỆT GÓC HỌC (TOPBAR SCENE.CSS)
          ==================================================================== */}
      <header className={styles.topBar}>
        <Link href="/" className={styles.topBack}>
          <svg className={styles.topIcon} viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>Góc học</span>
        </Link>

        <nav className={styles.topTabs} aria-label="Các khu trong phòng">
          <button
            type="button"
            className={`${styles.topTab} ${activeScreen === 'lesson' ? styles.topTabActive : ''}`}
            aria-current={activeScreen === 'lesson' ? 'page' : undefined}
            onClick={() => switchScreen('lesson')}
          >
            Học tiếp
          </button>
          <button
            type="button"
            className={`${styles.topTab} ${activeScreen === 'ide' ? styles.topTabActive : ''}`}
            aria-current={activeScreen === 'ide' ? 'page' : undefined}
            onClick={() => switchScreen('ide')}
          >
            Bàn thí nghiệm
          </button>
          <Link href="/#roadmap" className={styles.topTab}>
            Lộ trình
          </Link>
          <Link href="/#courses" className={styles.topTab}>
            Khoá học
          </Link>
          <button
            type="button"
            className={`${styles.topTab} ${activeScreen === 'practice' ? styles.topTabActive : ''}`}
            aria-current={activeScreen === 'practice' ? 'page' : undefined}
            onClick={() => switchScreen('practice')}
          >
            Ôn tập
          </button>
          <Link href="/#achievements" className={styles.topTab}>
            Thành tựu
          </Link>
          <Link href="/#phone" className={styles.topTab}>
            Điện thoại
          </Link>
        </nav>

        <div className={styles.topRightPills}>
          <div className={`${styles.topPill} ${styles.topPillDone}`} title="Bài đã xong">
            <svg className={styles.topIcon} viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span>
              {doneLessons.length}/{TOTAL_LESSONS}
            </span>
          </div>
          <div className={`${styles.topPill} ${styles.topPillXp}`} title="Tổng XP">
            <svg className={styles.topIcon} viewBox="0 0 24 24">
              <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
            </svg>
            <span>{xp.toLocaleString('vi-VN')}</span>
          </div>
        </div>
      </header>

      {/* ====================================================================
          3. NỘI DUNG 3 TRANG TRUNG TÂM (CHUẨN NGANG 1080PX)
          ==================================================================== */}
      <main className={styles.stageContainer}>{stageContent}</main>
    </div>
  );
}
