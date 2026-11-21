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
import DailyPracticeView from '@/components/practice/DailyPracticeView';
import {
  COURSE_ID,
  ENROLLED_PATH,
  completedLessons,
} from '@/lib/practice-plan';
import {
  completeLessonWithAutoEnroll,
  loadLessonContentWithAutoEnroll,
  type LessonLoadErrorKind,
} from '@/lib/lofi-lesson-loader';
import {
  buildBookSpreads,
  type BookPageSpec,
  type IndexedPracticeItem,
  type IndexedReadBlock,
} from '@/lib/lofi-book-spreads';
import {
  correctIndex,
  maDeThu,
  optionDetail,
  optionText,
  tachDeVaCode,
  type ReadTrace,
  type StudioLesson,
} from '@/lib/studio-lesson';
import styles from './lofi-workspace.module.css';

export type LofiScreenType = 'lesson' | 'ide' | 'practice';
export type ChillScreenType = LofiScreenType;


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

function renderInlineCode(text: string): React.ReactNode {
  if (!text.includes('`')) return text;
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, idx) =>
    part.startsWith('`') && part.endsWith('`') && part.length >= 2 ? (
      <code key={idx} className={styles.bookInlineCode}>
        {part.slice(1, -1)}
      </code>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    ),
  );
}

function formatTraceSet(items?: [string, string][]): string {
  if (!items?.length) return '';
  return items.map(([k, v]) => `${k} = ${v}`).join(', ');
}

function errorHeadingFor(kind: LessonLoadErrorKind): string {
  switch (kind) {
    case 'network':
      return 'Chưa kết nối được Backend';
    case 'unauthorized':
      return 'Cần phiên học hợp lệ';
    case 'forbidden':
      return 'Chưa ghi danh khoá học';
    case 'not_found':
      return 'Chưa tìm thấy nội dung bài';
    case 'server':
      return 'Máy chủ đang gặp sự cố';
  }
}

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

  // Trạng thái Bài học: Quyển sách mở 2 trang (179 bài thật từ giáo trình)
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
  const [lessonError, setLessonError] = useState<{
    kind: LessonLoadErrorKind;
    message: string;
  } | null>(null);
  const [lessonReloadKey, setLessonReloadKey] = useState<number>(0);
  const pendingLastSpreadRef = useRef(false);

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
  const [practiceInputs, setPracticeInputs] = useState<Record<string, string>>({});
  const [revealedPractice, setRevealedPractice] = useState<Record<string, boolean>>({});
  const [revealedTrace, setRevealedTrace] = useState<Record<string, boolean>>({});
  const [expandedTraceTable, setExpandedTraceTable] = useState<Record<string, boolean>>({});
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

  // Nạp tiến độ người học trực tiếp từ Backend API
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [userRes, enrolledRes] = await Promise.all([
          apiFetch('/api/user').then((r) => (r.ok ? r.json() : null)).catch(() => null),
          apiFetch(ENROLLED_PATH).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (!alive) return;
        if (userRes && typeof userRes.xp === 'number') {
          setXp(userRes.xp);
        }
        if (enrolledRes) {
          const row = findEnrollment(asList(enrolledRes, 'enrolled'), COURSE_ID);
          const done = completedLessons(row?.completedLessonNumbers, CATALOG_LESSONS.length);
          if (done.length) {
            setDoneLessons((prev) => Array.from(new Set([...prev, ...done])).sort((a, b) => a - b));
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

  // Nạp nội dung bài học bắt buộc từ Backend API (tự ghi danh khi gặp 403)
  const currentCatalog = CATALOG_LESSONS[lessonIdx] ?? CATALOG_LESSONS[0];
  const lessonNo = currentCatalog.no;

  useEffect(() => {
    let alive = true;

    (async () => {
      await Promise.resolve();
      if (!alive) return;
      setLessonLoading(true);
      setLessonError(null);
      setCompleteBanner('');

      const res = await loadLessonContentWithAutoEnroll<StudioLesson>(
        COURSE_ID,
        lessonNo,
        apiFetch,
      );
      if (!alive) return;

      if (res.ok) {
        const nextSpreads = buildBookSpreads(res.lesson, tachDeVaCode);
        setLessonContent(res.lesson);
        if (pendingLastSpreadRef.current) {
          setSpreadIdx(Math.max(0, nextSpreads.length - 1));
          pendingLastSpreadRef.current = false;
        }
        if (res.completed) {
          setDoneLessons((prev) =>
            prev.includes(lessonNo) ? prev : [...prev, lessonNo].sort((a, b) => a - b),
          );
        }
        setLessonLoading(false);

        // Làm ấm các gói thư viện của bài (numpy, pandas, matplotlib, tzdata) nếu có
        const pkgs = res.lesson?.step_4?.packages;
        if (pkgs?.length) {
          pyRunnerRef.current?.prewarm(pkgs);
        }
        return;
      }

      pendingLastSpreadRef.current = false;
      setLessonError({ kind: res.kind, message: res.message });
      setLessonLoading(false);
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
    const alreadyDone = doneLessons.includes(lessonNo);
    if (!alreadyDone) {
      const nextDone = [...doneLessons, lessonNo].sort((a, b) => a - b);
      setDoneLessons(nextDone);
      setXp((prev) => prev + reward);
      setCompleteBanner(`Đang lưu tiến độ Bài ${lessonNo} (${currentCatalog.code}) lên máy chủ...`);
    } else {
      setCompleteBanner(`✓ Bài ${lessonNo} (${currentCatalog.code}) đã được ghi nhận xong từ trước.`);
    }

    const res = await completeLessonWithAutoEnroll(
      COURSE_ID,
      lessonNo,
      {
        lessonTitle: `${currentCatalog.code} · ${currentCatalog.title}`,
        xpEarned: reward,
        quizScore: 100,
      },
      apiFetch,
    );

    if (res.ok) {
      const gained =
        typeof res.data?.xpGained === 'number' && res.data.xpGained > 0
          ? res.data.xpGained
          : reward;
      setCompleteBanner(
        alreadyDone || res.data?.alreadyCompleted
          ? `✓ Bài ${lessonNo} (${currentCatalog.code}) đã được ghi nhận hoàn thành trên máy chủ.`
          : `🎉 Đã lưu lên máy chủ: Bài ${lessonNo} (${currentCatalog.code}) đã xong (+${gained} XP)!`,
      );
    } else {
      setCompleteBanner(
        `⚠️ Đã đánh dấu tạm trên trình duyệt, nhưng chưa lưu được lên máy chủ (${
          res.status ? `HTTP ${res.status}` : 'chưa kết nối backend'
        }).`,
      );
    }
  }, [currentCatalog, doneLessons, lessonNo]);

  /* ==========================================================================
     CHIA NỘI DUNG BÀI HỌC THẬT THÀNH CÁC CẶP TRANG SÁCH MỞ (4–6 SPREADS LINH HOẠT)
     ========================================================================== */
  const spreads = useMemo(
    () => (lessonContent ? buildBookSpreads(lessonContent, tachDeVaCode) : []),
    [lessonContent],
  );
  const totalSpreads = Math.max(1, spreads.length);
  const safeSpreadIdx = Math.min(spreadIdx, totalSpreads - 1);
  const currentSpread = spreads[safeSpreadIdx] ?? null;

  const handleChangeLesson = useCallback(
    (nextIdx: number, targetSpread = 0) => {
      const clamped = Math.max(0, Math.min(CATALOG_LESSONS.length - 1, nextIdx));
      if (targetSpread !== -1) {
        pendingLastSpreadRef.current = false;
        setSpreadIdx(Math.max(0, targetSpread));
      }
      setLessonIdx(clamped);
      if (typeof window !== 'undefined') {
        const url = `/lesson/${COURSE_ID}?lesson=${clamped}`;
        window.history.pushState(null, '', url);
      }
    },
    [],
  );

  const handlePrevSpread = () => {
    setFlipDir('prev');
    if (safeSpreadIdx > 0) {
      setSpreadIdx((s) => Math.min(s, totalSpreads - 1) - 1);
    } else if (lessonIdx > 0) {
      pendingLastSpreadRef.current = true;
      handleChangeLesson(lessonIdx - 1, -1);
    }
  };

  const handleNextSpread = () => {
    setFlipDir('next');
    if (safeSpreadIdx < totalSpreads - 1) {
      setSpreadIdx((s) => Math.min(s, totalSpreads - 1) + 1);
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

  const renderReadBlock = ({ block, sliceIndex, blockIndex }: IndexedReadBlock) => {
    const bKey = `${lessonNo}-s${sliceIndex}-b${blockIndex}`;
    switch (block.type) {
      case 'paragraph':
        return (
          <p key={bKey} className={styles.pageLeadParagraph}>
            {renderInlineCode(block.text)}
          </p>
        );
      case 'code': {
        const traceKey = `${bKey}-trace`;
        const trace: ReadTrace | undefined = block.trace;
        return (
          <div key={bKey} className={styles.bookReadCodeGroup}>
            <div className={styles.bookCodeBox}>
              {block.code
                .trimEnd()
                .split('\n')
                .map((line, lIdx) => (
                  <div key={lIdx}>{line || ' '}</div>
                ))}
            </div>
            {block.expected !== undefined && block.expected !== '' && (
              <div className={styles.bookExpectedBox}>
                <span className={styles.bookExpectedLabel}>KẾT QUẢ</span>
                <pre className={styles.bookExpectedPre}>{block.expected}</pre>
              </div>
            )}
            {trace && (
              <div className={styles.bookTraceBox}>
                <div className={styles.bookTracePrompt}>
                  <strong>Đoán trước:</strong> {renderInlineCode(trace.predict.prompt)}
                </div>
                <div className={styles.bookActionRow}>
                  <button
                    type="button"
                    className={styles.bookSecondaryBtn}
                    onClick={() =>
                      setRevealedTrace((prev) => ({
                        ...prev,
                        [traceKey]: !prev[traceKey],
                      }))
                    }
                  >
                    {revealedTrace[traceKey]
                      ? `Đáp án: ${trace.predict.answer}`
                      : '👀 Xem đáp án dự đoán'}
                  </button>
                  <button
                    type="button"
                    className={styles.bookSecondaryBtn}
                    onClick={() =>
                      setExpandedTraceTable((prev) => ({
                        ...prev,
                        [traceKey]: !prev[traceKey],
                      }))
                    }
                  >
                    {expandedTraceTable[traceKey]
                      ? 'Ẩn bảng từng bước'
                      : `📊 Bảng từng bước (${trace.rows.length})`}
                  </button>
                </div>
                {expandedTraceTable[traceKey] && (
                  <div className={styles.bookTableWrap}>
                    <table className={styles.bookTable}>
                      <thead>
                        <tr>
                          <th>Dòng</th>
                          <th>Biến đổi</th>
                          <th>Đầu ra / Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trace.rows.slice(0, 14).map((r, rIdx) => (
                          <tr key={rIdx}>
                            <td>L{r.line}</td>
                            <td>
                              {r.set?.length ? <code>{formatTraceSet(r.set)}</code> : '—'}
                            </td>
                            <td>
                              {r.out
                                ? `in: ${r.out}`
                                : r.ret
                                  ? `trả về: ${r.ret}`
                                  : r.exc
                                    ? `lỗi: ${r.exc}`
                                    : r.enter && r.fn
                                      ? `vào ${r.fn}()`
                                      : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {block.tryIt && (
              <div className={styles.bookActionRow}>
                <button
                  type="button"
                  className={styles.bookSecondaryBtn}
                  onClick={() =>
                    openCodeInIde(maDeThu(step1?.read, sliceIndex, blockIndex) ?? block.code)
                  }
                >
                  ▶ Chạy thử ở Bàn thí nghiệm
                </button>
              </div>
            )}
          </div>
        );
      }
      case 'terminal':
        return (
          <div key={bKey} className={styles.bookTerminalBox}>
            <div className={styles.bookTerminalTag}>TERMINAL</div>
            <pre className={styles.bookTerminalPre}>$ {block.code}</pre>
            {block.expected && (
              <p className={styles.bookTerminalNote}>{renderInlineCode(block.expected)}</p>
            )}
          </div>
        );
      case 'figure':
        return (
          <div key={bKey} className={styles.bookFigureBox}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.bookFigureImg}
              src={block.src}
              alt={block.alt || 'Biểu đồ minh hoạ'}
            />
            {block.alt && <span className={styles.bookFigureCaption}>{block.alt}</span>}
          </div>
        );
      case 'table':
        return (
          <div key={bKey} className={styles.bookTableWrap}>
            <table className={styles.bookTable}>
              <thead>
                <tr>
                  {block.headers.map((h, i) => (
                    <th key={i}>{renderInlineCode(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>{renderInlineCode(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'diagram':
        return (
          <div key={bKey} className={styles.bookDiagramFrame}>
            <div className={styles.bookConceptTag}>{renderInlineCode(block.title)}</div>
            <div className={styles.bookDiagramGrid}>
              {block.lanes.map((lane, lIdx) => (
                <div key={lIdx} className={styles.bookDiagramLane}>
                  <div className={styles.bookDiagramLaneTitle}>
                    {renderInlineCode(lane.label)}
                  </div>
                  <div className={styles.bookDiagramSteps}>
                    {lane.steps.map((st, sIdx) => (
                      <div key={sIdx} className={styles.bookDiagramStep}>
                        {renderInlineCode(st)}
                      </div>
                    ))}
                  </div>
                  {lane.note && (
                    <p className={styles.bookDiagramNote}>{renderInlineCode(lane.note)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  const renderPracticeList = (items: IndexedPracticeItem[], totalPractice: number) =>
    items.map(({ practiceIndex, item }) => {
      const prKey = `${lessonNo}-practice-${practiceIndex}`;
      const isRevealed = Boolean(revealedPractice[prKey]);
      return (
        <div key={prKey} className={styles.bookPracticeCard}>
          <p className={styles.pageSectionLabel}>
            CÂU TỰ LUYỆN {practiceIndex + 1}/{totalPractice}
          </p>
          <p className={styles.pageLeadParagraph} style={{ fontWeight: 600 }}>
            {renderInlineCode(item.prompt)}
          </p>
          <textarea
            className={styles.bookPracticeTextarea}
            value={practiceInputs[prKey] ?? ''}
            onChange={(e) =>
              setPracticeInputs((prev) => ({ ...prev, [prKey]: e.target.value }))
            }
            placeholder="Viết nháp câu trả lời hoặc suy nghĩ của bạn trước khi xem đáp án..."
            rows={2}
            spellCheck={false}
          />
          <div className={styles.bookActionRow}>
            <button
              type="button"
              className={styles.bookSecondaryBtn}
              onClick={() =>
                setRevealedPractice((prev) => ({
                  ...prev,
                  [prKey]: !prev[prKey],
                }))
              }
            >
              {isRevealed ? 'Ẩn đáp án mẫu' : '💡 Xem đáp án mẫu'}
            </button>
            {item.answerCode && (
              <button
                type="button"
                className={styles.bookSecondaryBtn}
                onClick={() => openCodeInIde(item.answerCode!)}
              >
                ▶ Chạy ở Bàn thí nghiệm
              </button>
            )}
          </div>
          {isRevealed && (
            <div className={styles.paperFeedback}>
              <div>{renderInlineCode(item.answer)}</div>
              {item.answerCode && (
                <div className={styles.bookCodeBox} style={{ marginTop: 8 }}>
                  {item.answerCode
                    .trimEnd()
                    .split('\n')
                    .map((line, lIdx) => (
                      <div key={lIdx}>{line || ' '}</div>
                    ))}
                </div>
              )}
              {item.answerExpected && (
                <div className={styles.bookExpectedBox} style={{ marginTop: 6 }}>
                  <span className={styles.bookExpectedLabel}>KẾT QUẢ</span>
                  <pre className={styles.bookExpectedPre}>{item.answerExpected}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      );
    });

  const renderLegacyLeft = (idx: number) => {
    if (idx === 0) {
      return (
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
                    {blk.body || (blk.bullets ? blk.bullets.slice(0, 2).join(' • ') : '')}
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
                {theoryBlocks[2].body || (theoryBlocks[2].bullets ?? []).join(' • ')}
              </div>
            )
          )}
        </div>
      );
    }

    if (idx === 1) {
      return (
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
                  {step1.predict.options[pickedPredict[`${lessonNo}-predict`]]?.detail ||
                    'Quan sát kỹ sự khác biệt giữa các lần thực thi.'}
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
                  const text = optionText(rawOpt);
                  const ansIdx = correctIndex(mcqList[0]);
                  const mKey = `${lessonNo}-mcq-0`;
                  const chosen = pickedMcq[mKey];
                  const isAnswered = chosen !== undefined;
                  const isCorrect = oIdx === ansIdx;
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
                        <strong>{LETTERS[oIdx]}.</strong> {text}
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
      );
    }

    return (
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
    );
  };

  const renderLegacyRight = (idx: number) => {
    if (idx === 0) {
      return (
        <div className={styles.pageBodyFlow}>
          <p className={styles.pageSectionLabel}>SƠ ĐỒ TRỰC QUAN &amp; Ý CHÍNH</p>

          {mainFigure ? (
            <div className={styles.bookFigureBox}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
              {explainItems.slice(0, 3).map((item, i) => (
                <div key={i} style={{ marginTop: i > 0 ? 4 : 0 }}>
                  {item.n ?? i + 1}. {item.body}
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
                  Chạy thử ở Bàn thí nghiệm
                </button>
              </div>
            </>
          )}
        </div>
      );
    }

    if (idx === 1) {
      return (
        <div className={styles.pageBodyFlow}>
          {mcqList.slice(1, 3).map((mcq, i) => {
            const realIdx = i + 1;
            const mKey = `${lessonNo}-mcq-${realIdx}`;
            const chosen = pickedMcq[mKey];
            const isAnswered = chosen !== undefined;
            const ansIdx = correctIndex(mcq);

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
                    const text = optionText(rawOpt);
                    const isCorrect = oIdx === ansIdx;
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
                          <strong>{LETTERS[oIdx]}.</strong> {text}
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
      );
    }

    return (
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
            {step4.task.io.slice(0, 3).map((io, i) => (
              <div key={i}>
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
            {step4.hints.map((h, i) => (
              <div key={i} style={{ marginTop: i > 0 ? 4 : 0 }}>
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

        {completeBanner && <div className={styles.paperFeedback}>{completeBanner}</div>}
      </div>
    );
  };

  const renderBookPage = (page: BookPageSpec, isFirstLeftPage: boolean) => {
    switch (page.kind) {
      case 'read-slice':
        return (
          <div className={styles.pageBodyFlow}>
            {isFirstLeftPage ? (
              <>
                <p className={styles.pageSectionLabel}>
                  {currentCatalog.moduleTitle.toUpperCase()} · {currentCatalog.minutes} PHÚT
                </p>
                <h2 className={styles.pageMainTitle}>
                  {lessonContent?.title || `${currentCatalog.code} · ${currentCatalog.title}`}
                </h2>
              </>
            ) : (
              <p className={styles.pageSectionLabel}>{page.heading.toUpperCase()}</p>
            )}
            {page.blocks.map(renderReadBlock)}
          </div>
        );

      case 'mcq-page':
        return (
          <div className={styles.pageBodyFlow}>
            {page.predict && (
              <>
                <p className={styles.pageSectionLabel}>DỰ ĐOÁN KẾT QUẢ</p>
                <p className={styles.pageLeadParagraph} style={{ fontWeight: 700 }}>
                  {renderInlineCode(page.predict.question)}
                </p>
                {page.predict.code && (
                  <div className={styles.bookMcqCodeBox}>
                    {page.predict.code.split('\n').map((line, lIdx) => (
                      <div key={lIdx}>{line || ' '}</div>
                    ))}
                  </div>
                )}
                <div className={styles.paperOptList}>
                  {page.predict.options.map((opt, oIdx) => {
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
                    {page.predict.options[pickedPredict[`${lessonNo}-predict`]]?.detail ||
                      'Quan sát kỹ sự khác biệt giữa các lần thực thi.'}
                  </div>
                )}
              </>
            )}

            {page.items.map((mcq) => {
              const mKey = `${lessonNo}-mcq-${mcq.mcqIndex}`;
              const chosen = pickedMcq[mKey];
              const isAnswered = chosen !== undefined;
              const ansIdx = correctIndex(mcq.raw);
              const detailText =
                chosen !== undefined
                  ? optionDetail(mcq.raw.options[chosen]) ||
                    mcq.raw.explanation ||
                    'Đáp án đúng theo nguyên lý trong bài.'
                  : '';

              return (
                <div key={mKey} className={styles.bookMcqBlock}>
                  <p className={styles.pageSectionLabel}>
                    CÂU HỎI CỦNG CỐ #{mcq.mcqIndex + 1}
                  </p>
                  <p className={styles.pageLeadParagraph} style={{ fontWeight: 700 }}>
                    {renderInlineCode(mcq.prompt)}
                  </p>
                  {mcq.code && (
                    <div className={styles.bookMcqCodeBox}>
                      {mcq.code.split('\n').map((line, lIdx) => (
                        <div key={lIdx}>{line || ' '}</div>
                      ))}
                    </div>
                  )}
                  <div className={styles.paperOptList}>
                    {mcq.raw.options.map((rawOpt, oIdx) => {
                      const text = optionText(rawOpt);
                      const isCorrect = oIdx === ansIdx;
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
                            <strong>{LETTERS[oIdx]}.</strong> {text}
                          </span>
                          {isAnswered && isCorrect && <span>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                  {isAnswered && (
                    <div className={styles.paperFeedback}>{renderInlineCode(detailText)}</div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'practice-page':
        return (
          <div className={styles.pageBodyFlow}>
            {renderPracticeList(page.items, page.totalPractice)}
          </div>
        );

      case 'challenge-spec': {
        const s4 = page.step4;
        return (
          <div className={styles.pageBodyFlow}>
            {page.extraPractice?.length
              ? renderPracticeList(page.extraPractice, page.extraPractice.length)
              : null}
            <p className={styles.pageSectionLabel}>THỬ THÁCH ĐỘC LẬP</p>
            <h2 className={styles.pageMainTitle}>
              {s4.task?.title || `Thực hành bài ${currentCatalog.code}`}
            </h2>
            <p className={styles.pageLeadParagraph}>
              {renderInlineCode(
                s4.task?.body ||
                  page.fallbackTaskBody ||
                  'Áp dụng kiến thức vừa học để hoàn thành bài thực hành.',
              )}
            </p>

            {s4.task?.io && s4.task.io.length > 0 && (
              <div className={styles.bookCalloutNote}>
                <b>CA KIỂM THỬ MẪU (INPUT ➔ OUTPUT)</b>
                {s4.task.io.map((io, idx) => (
                  <div key={idx}>
                    <code>{io.label}</code> ➔ <strong>{io.value}</strong>
                  </div>
                ))}
              </div>
            )}

            {s4.contract && (
              <div className={styles.bookCalloutNote}>
                <b>QUY ƯỚC DỮ LIỆU</b>
                {s4.contract.mode === 'script'
                  ? renderInlineCode(
                      `Đầu vào có sẵn trong biến \`${s4.contract.inputVariable ?? 'data'}\`, gán kết quả vào biến \`${s4.contract.resultVariable ?? 'result'}\`.`,
                    )
                  : 'Viết hàm theo mẫu trong khung khởi tạo để trả kết quả.'}
              </div>
            )}

            {s4.dataFiles && s4.dataFiles.length > 0 && (
              <div className={styles.bookCalloutNote}>
                <b>TỆP DỮ LIỆU ĐÍNH KÈM</b>
                {s4.dataFiles.map((fileName, idx) => (
                  <div key={idx}>
                    <code>{fileName}</code>
                  </div>
                ))}
              </div>
            )}

            {s4.hints && s4.hints.length > 0 && (
              <>
                <div className={styles.bookActionRow}>
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
                    {showHints[lessonNo] ? 'Ẩn gợi ý' : `💡 Xem gợi ý (${s4.hints.length})`}
                  </button>
                </div>
                {showHints[lessonNo] && (
                  <div className={styles.bookCalloutNote}>
                    <b>GỢI Ý CÁCH LÀM</b>
                    {s4.hints.map((h, idx) => (
                      <div key={idx} style={{ marginTop: idx > 0 ? 4 : 0 }}>
                        <strong>{h.title}:</strong> {renderInlineCode(h.body)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      case 'challenge-action': {
        const s4 = page.step4;
        return (
          <div className={styles.pageBodyFlow}>
            <p className={styles.pageSectionLabel}>
              {s4.procedure?.length ? 'QUY TRÌNH THỰC HÀNH TRÊN MÁY' : 'BÀI TẬP & NỘP BÀI'}
            </p>

            {s4.procedure && s4.procedure.length > 0 ? (
              <ol className={styles.bookProcedureList}>
                {s4.procedure.map((stepText, idx) => (
                  <li key={idx}>{renderInlineCode(stepText)}</li>
                ))}
              </ol>
            ) : null}

            {s4.env && (
              <div className={styles.bookCalloutNote}>
                <b>MÔI TRƯỜNG CHẠY</b>
                {renderInlineCode(s4.env)}
              </div>
            )}

            {s4.starterCode && (
              <div className={styles.bookCodeBox}>
                {s4.starterCode
                  .trimEnd()
                  .split('\n')
                  .map((line, lIdx) => (
                    <div key={lIdx}>{line || ' '}</div>
                  ))}
              </div>
            )}

            <div className={styles.bookActionRow}>
              {s4.starterCode && (
                <button
                  type="button"
                  className={styles.bookSecondaryBtn}
                  onClick={() => openCodeInIde(s4.starterCode!)}
                >
                  ▶ Chạy thử ở Bàn thí nghiệm
                </button>
              )}

              {s4.solutionCode && (
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

            {showSolution[lessonNo] && s4.solutionCode && (
              <div className={styles.bookCodeBox}>
                {s4.solutionCode
                  .trimEnd()
                  .split('\n')
                  .map((line, lIdx) => (
                    <div key={lIdx}>{line || ' '}</div>
                  ))}
              </div>
            )}

            {completeBanner && <div className={styles.paperFeedback}>{completeBanner}</div>}
          </div>
        );
      }

      case 'legacy':
        return page.side === 'left'
          ? renderLegacyLeft(page.legacySpreadIdx)
          : renderLegacyRight(page.legacySpreadIdx);
    }
  };

  const stageContent = (
    <>
        {activeScreen === 'lesson' && (
          /* ------------------------------------------------------------------
             TRANG 1: QUYỂN SÁCH BÀI HỌC MỞ 2 TRANG & LẬT TRANG 3D (179 BÀI THẬT)
             ------------------------------------------------------------------ */
          <div ref={shellRef} className={styles.bookStageWrap}>
            <div className={styles.openBookCover}>
              <div
                key={`lesson-${lessonIdx}-spread-${safeSpreadIdx}`}
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
                          Bài {item.no}/{CATALOG_LESSONS.length} · {item.code} · {item.title}
                        </option>
                      ))}
                    </select>
                    <span>
                      {lessonLoading
                        ? 'ĐANG MỞ'
                        : lessonError
                          ? 'LỖI KẾT NỐI'
                          : currentSpread?.left.tag ?? 'LÝ THUYẾT'}
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
                      <p className={styles.pageSectionLabel}>
                        {lessonError.kind === 'network' ? 'MÁY CHỦ BÀI HỌC' : 'THÔNG BÁO TẢI BÀI'}
                      </p>
                      <h2 className={styles.pageMainTitle}>{errorHeadingFor(lessonError.kind)}</h2>
                      <p className={styles.pageLeadParagraph}>
                        {lessonError.kind === 'network'
                          ? `Nội dung bài học ${currentCatalog.code} cần được nạp trực tiếp từ máy chủ backend.`
                          : `Không nạp được bài học ${currentCatalog.code} từ API.`}
                      </p>
                      <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <p style={{ margin: 0, fontSize: 13.5, color: '#991b1b', lineHeight: 1.5 }}>
                          ⚠️ {lessonError.message}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLessonReloadKey((k) => k + 1)}
                        className={styles.bookPrimaryBtn}
                        style={{ marginTop: 18, width: 'fit-content', padding: '8px 20px' }}
                      >
                        ↻ Thử lại
                      </button>
                    </div>
                  ) : currentSpread ? (
                    renderBookPage(currentSpread.left, safeSpreadIdx === 0)
                  ) : null}

                  <div className={styles.pageFooterRow}>
                    <span>Trang {safeSpreadIdx * 2 + 1}</span>
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
                      {lessonLoading
                        ? 'ĐANG TẢI'
                        : lessonError
                          ? 'HƯỚNG DẪN'
                          : currentSpread?.right.tag ?? `THỬ THÁCH +${currentCatalog.xp} XP`}
                    </span>
                  </div>

                  {lessonLoading ? (
                    <div className={styles.pageBodyFlow}>
                      <p className={styles.pageSectionLabel}>ĐANG TẢI...</p>
                      <p className={styles.pageLeadParagraph}>Đang kết nối tới máy chủ backend...</p>
                    </div>
                  ) : lessonError ? (
                    lessonError.kind === 'network' ? (
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
                    ) : (
                      <div className={styles.pageBodyFlow}>
                        <p className={styles.pageSectionLabel}>KIỂM TRA NHANH</p>
                        <h2 className={styles.pageMainTitle}>Chi tiết phản hồi máy chủ</h2>
                        <p className={styles.pageLeadParagraph}>
                          {lessonError.kind === 'not_found'
                            ? 'Bài học này chưa có trong cơ sở dữ liệu. Hãy chạy lại script seed khoá python_advanced rồi bấm Thử lại.'
                            : lessonError.kind === 'unauthorized'
                              ? 'Trình duyệt chưa có hoặc đã hết phiên làm việc hợp lệ. Hãy tải lại trang để làm mới phiên.'
                              : 'Máy chủ đã phản hồi lỗi khi đọc nội dung bài học. Vui lòng bấm Thử lại ở trang đối diện.'}
                        </p>
                      </div>
                    )
                  ) : currentSpread ? (
                    renderBookPage(currentSpread.right, false)
                  ) : null}

                  <div className={styles.pageFooterRow}>
                    <span>
                      Bài {lessonNo} / {CATALOG_LESSONS.length} ({currentCatalog.code})
                    </span>
                    <span>Trang {safeSpreadIdx * 2 + 2}</span>
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
                disabled={lessonIdx === 0 && safeSpreadIdx === 0}
              >
                &lt; Trang trước
              </button>

              <div className={styles.bookNavDotsWrap}>
                {Array.from({ length: totalSpreads }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Cặp trang ${idx + 1}`}
                    onClick={() => {
                      setFlipDir(idx > safeSpreadIdx ? 'next' : 'prev');
                      setSpreadIdx(idx);
                    }}
                    className={`${styles.bookNavDot} ${
                      safeSpreadIdx === idx ? styles.bookNavDotActive : ''
                    }`}
                  />
                ))}
                <span>
                  {safeSpreadIdx + 1} / {totalSpreads}
                </span>
              </div>

              <button
                type="button"
                className={styles.bookNavNextBtn}
                onClick={handleNextSpread}
              >
                {safeSpreadIdx >= totalSpreads - 1 ? 'Bài tiếp theo >' : 'Trang sau >'}
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
          <DailyPracticeView
            shellRef={shellRef}
            onBackToLesson={() => switchScreen('lesson')}
            onEarnXp={(delta) => setXp((prev) => prev + delta)}
          />
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
          <Link href="/bookshelf" className={styles.topTab}>
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
              {doneLessons.length}/{CATALOG_LESSONS.length}
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
