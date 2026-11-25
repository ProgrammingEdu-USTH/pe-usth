'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch, asList, findEnrollment } from '@/lib/api';
import CURRICULA_JSON from '@/lib/curricula.json';
import SQL_CATALOG_JSON from '@/lib/sql-catalog.json';
import {
  readIdeCodeOnLoad,
  sessionStorageOrNull,
  forgetIdeReloadCode,
  IDE_RELOAD_CODE_KEY,
} from '@/lib/ide-handoff';
import { shouldPrewarm } from '@/components/python-studio/prewarm-gate';
import { PyodideRunner } from '@/components/python-studio/runner/pyodide-runner';
import DailyPracticeView from '@/components/practice/DailyPracticeView';
import {
  COURSE_ID as DEFAULT_COURSE_ID,
  ENROLLED_PATH,
  completedLessons,
} from '@/lib/practice-plan';
import {
  completeLessonWithAutoEnroll,
  ensureCourseEnrolled,
  loadLessonContentWithAutoEnroll,
  type LessonLoadErrorKind,
} from '@/lib/lofi-lesson-loader';
import {
  buildBookSpreads,
  type BookPageSpec,
  type IndexedPracticeItem,
  type IndexedReadBlock,
  type SqlMinigamePageSpec,
} from '@/lib/lofi-book-spreads';
import {
  buildSqlBookSpreads,
  isSqlCourse,
  type RawSqlLesson,
  type SqlConceptCard,
  type SqlCourseId,
} from '@/lib/lofi-sql-adapter';
import {
  buildSqlitePreviewScript,
  gradeSqlAnswer,
  gradeStep3Tokens,
  parseSqlitePreviewOutput,
  type SqlSchemaLike,
  type SqlitePreviewResult,
} from '@/lib/lofi-sql-grader';
import {
  SQL_COURSE_META,
  loadSqlConceptCards,
  loadSqlCourseData,
} from '@/lib/lofi-sql-loader';
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
   DANH MỤC BÀI HỌC THEO KHOÁ (Python pe-da + 3 khoá SQL)
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

type SqlCatalogRow = {
  no: number;
  index: number;
  code: string;
  title: string;
  module: number;
  moduleTitle: string;
  minutes: number;
  xp: number;
};

function getCatalogLessons(courseId: string): CatalogLessonItem[] {
  if (isSqlCourse(courseId)) {
    const rows = (SQL_CATALOG_JSON as Record<string, SqlCatalogRow[]>)[courseId] ?? [];
    return rows.map((row) => ({
      no: row.no,
      code: row.code,
      title: row.title,
      moduleTitle: row.moduleTitle || `Module ${row.module}`,
      moduleShort: `M${row.module}`,
      minutes: row.minutes,
      xp: row.xp,
    }));
  }

  const raw = CURRICULA_JSON as unknown as {
    CURRICULA: Record<string, { modules?: { title: string; lessons: string[] }[] }>;
    LESSON_META?: Record<string, { code: string; minutes: number; xp: number }[]>;
  };
  const mods = raw.CURRICULA[courseId]?.modules ?? [];
  const metas = raw.LESSON_META?.[courseId] ?? [];
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
}

const DEFAULT_IDE_CODE = `import os

def khoi_tao_tien_trinh(ten_tac_vu: str):
    pid = os.getpid()
    print(f"🚀 [PID {pid}] Đang chạy tác vụ: {ten_tac_vu}")

if __name__ == "__main__":
    khoi_tao_tien_trinh("Lofi_Rain_Synthesizer")
    khoi_tao_tien_trinh("Python_Code_Runner")`;

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
  courseId = DEFAULT_COURSE_ID,
  initialScreen = 'lesson',
  initialLessonIdx = 0,
  embedded = false,
  onEmbeddedSwitch,
  onProgressChange,
}: {
  courseId?: string;
  initialScreen?: LofiScreenType;
  initialLessonIdx?: number;
  embedded?: boolean;
  onEmbeddedSwitch?: (nextScreen: LofiScreenType, nextLessonIdx?: number) => void;
  onProgressChange?: (doneLessons: number[], xp: number) => void;
}) {
  const activeCourseId = courseId || DEFAULT_COURSE_ID;
  const isSql = isSqlCourse(activeCourseId);
  const catalogLessons = useMemo(() => getCatalogLessons(activeCourseId), [activeCourseId]);

  const [activeScreen, setActiveScreen] = useState<LofiScreenType>(initialScreen);

  // Tiến độ người học thật (đồng bộ giữa Backend API & state)
  const [doneLessons, setDoneLessons] = useState<number[]>([]);
  const [xp, setXp] = useState<number>(0);

  // Trạng thái Bài học: Quyển sách mở 2 trang (179 bài Python hoặc 66 bài SQL)
  const [spreadIdx, setSpreadIdx] = useState(0);
  const [lessonIdx, setLessonIdx] = useState<number>(() => {
    const safe =
      Number.isInteger(initialLessonIdx) && initialLessonIdx >= 0 && initialLessonIdx < catalogLessons.length
        ? initialLessonIdx
        : 0;
    return safe;
  });
  const [flipDir, setFlipDir] = useState<'next' | 'prev'>('next');
  const [lessonContent, setLessonContent] = useState<StudioLesson | null>(null);
  const [sqlLesson, setSqlLesson] = useState<RawSqlLesson | null>(null);
  const [sqlCardsMap, setSqlCardsMap] = useState<Map<string, SqlConceptCard>>(() => new Map());
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
      initialLessonIdx < catalogLessons.length &&
      prevInitialLessonIdxRef.current !== initialLessonIdx
    ) {
      prevInitialLessonIdxRef.current = initialLessonIdx;
      setLessonIdx(initialLessonIdx);
      setSpreadIdx(0);
    }
  }, [initialLessonIdx, catalogLessons.length]);

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

  // Trạng thái tương tác riêng cho bài học SQL (Bước 2 minigame, Bước 3 ghép lệnh, Bước 4 editor + SQLite)
  const [sqlSelectedChip, setSqlSelectedChip] = useState<Record<string, string | null>>({});
  const [sqlClassifyPick, setSqlClassifyPick] = useState<Record<string, Record<string, string>>>({});
  const [sqlClassifyResult, setSqlClassifyResult] = useState<Record<string, { ok: boolean; msg: string } | null>>({});
  const [sqlMatchLeft, setSqlMatchLeft] = useState<Record<string, string | null>>({});
  const [sqlMatchPick, setSqlMatchPick] = useState<Record<string, Record<string, string>>>({});
  const [sqlMatchResult, setSqlMatchResult] = useState<Record<string, { ok: boolean; msg: string } | null>>({});
  const [sqlOrderList, setSqlOrderList] = useState<Record<string, string[]>>({});
  const [sqlOrderResult, setSqlOrderResult] = useState<Record<string, { ok: boolean; msg: string } | null>>({});
  const [sqlBugLine, setSqlBugLine] = useState<Record<string, number | undefined>>({});
  const [sqlBugResult, setSqlBugResult] = useState<Record<string, { ok: boolean; msg: string } | null>>({});
  const [sqlBuilderZones, setSqlBuilderZones] = useState<
    Record<string, Record<string, Array<{ uid: string; token: string; type: string }>>>
  >({});
  const [sqlBuilderActiveZone, setSqlBuilderActiveZone] = useState<Record<string, string>>({});
  const [sqlBuilderResult, setSqlBuilderResult] = useState<Record<string, { ok: boolean; msg: string } | null>>({});
  const [sqlBuilderHintsOpen, setSqlBuilderHintsOpen] = useState<Record<string, boolean>>({});
  const [sqlBuilderAnsOpen, setSqlBuilderAnsOpen] = useState<Record<string, boolean>>({});
  const [sqlEditorCode, setSqlEditorCode] = useState<Record<string, string>>({});
  const [sqlGradeResult, setSqlGradeResult] = useState<
    Record<string, { ok: boolean; text: string; suggestion?: string } | null>
  >({});
  const [sqlSqlitePreview, setSqlSqlitePreview] = useState<Record<string, SqlitePreviewResult | null>>({});
  const [sqlRunning, setSqlRunning] = useState<boolean>(false);
  const [sqlChallengeHintLevel, setSqlChallengeHintLevel] = useState<Record<string, number>>({});
  const [sqlFillFeedback, setSqlFillFeedback] = useState<Record<string, { ok: boolean; msg: string } | null>>({});

  // Trạng thái Bàn thí nghiệm (Laptop VS Code 70/30)
  const [ideCustomCode, setIdeCustomCode] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_IDE_CODE;
    return readIdeCodeOnLoad(window.location.hash, sessionStorageOrNull()) ?? DEFAULT_IDE_CODE;
  });
  const pyRunnerRef = useRef<PyodideRunner | null>(null);

  const shellRef = useRef<HTMLDivElement>(null);

  // Máy tính macOS (iframe) báo 'đã tắt máy': thoát như bấm nút ‹ Góc học của cảnh — laptop gập về bàn.
  useEffect(() => {
    if (activeScreen !== 'ide') return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || (e.data as { type?: string } | null)?.type !== 'pe-mac:off') return;
      document.getElementById('backBtn')?.click();
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [activeScreen]);

  // Xoá mã tạm sau khi nạp từ sessionStorage (chuẩn IdeClient)
  useEffect(() => {
    forgetIdeReloadCode(sessionStorageOrNull());
  }, []);

  // Chỉ làm ấm Pyodide ở bài học Python (theo prewarm-gate.ts):
  // - /practice đã có DailyPracticeView tự prewarm qua useCodeRunner
  // - /ide (iframe máy tính macOS) tự nạp Pyodide bên trong iframe
  // - 3 khoá SQL chỉ nạp lười khi học viên bấm Chạy thử SQL
  const shouldWarmPython =
    activeScreen === 'lesson' && !isSql && shouldPrewarm(lessonContent);

  useEffect(() => {
    if (!shouldWarmPython || pyRunnerRef.current) return;
    const runner = new PyodideRunner();
    pyRunnerRef.current = runner;
    runner.prewarm();
  }, [shouldWarmPython]);

  useEffect(() => {
    return () => {
      pyRunnerRef.current?.dispose();
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
        if (Number.isInteger(parsed) && parsed >= 0 && parsed < catalogLessons.length) {
          setLessonIdx(parsed);
          setSpreadIdx(0);
        }
      }
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [embedded, catalogLessons.length]);

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
        let targetUrl = `/lesson/${activeCourseId}?lesson=${targetLesson}`;
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
    [embedded, lessonIdx, onEmbeddedSwitch, activeCourseId],
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
          const row = findEnrollment(asList(enrolledRes, 'enrolled'), activeCourseId);
          const done = completedLessons(row?.completedLessonNumbers, catalogLessons.length);
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
  }, [activeCourseId, catalogLessons.length]);

  // Nạp nội dung bài học (Python từ API; SQL từ JSON + auto-enroll nền)
  const currentCatalog = useMemo(
    () =>
      catalogLessons[lessonIdx] ??
      catalogLessons[0] ?? {
        no: 1,
        code: 'B01',
        title: 'Bài 1',
        moduleTitle: 'Học phần 1',
        moduleShort: 'M1',
        minutes: 15,
        xp: 50,
      },
    [catalogLessons, lessonIdx],
  );
  const lessonNo = currentCatalog.no;
  const lessonKey = `${activeCourseId}-${lessonNo}`;

  useEffect(() => {
    let alive = true;

    (async () => {
      await Promise.resolve();
      if (!alive) return;
      setLessonLoading(true);
      setLessonError(null);
      setCompleteBanner('');

      if (isSqlCourse(activeCourseId)) {
        void ensureCourseEnrolled(activeCourseId, apiFetch);
        try {
          const [lessons, cards] = await Promise.all([
            loadSqlCourseData(activeCourseId as SqlCourseId),
            loadSqlConceptCards().catch(() => [] as SqlConceptCard[]),
          ]);
          if (!alive) return;
          const raw = lessons[lessonNo - 1];
          if (!raw) {
            setLessonError({
              kind: 'not_found',
              message: `Không tìm thấy nội dung bài ${lessonNo} trong khoá ${activeCourseId}.`,
            });
            setLessonLoading(false);
            return;
          }
          const cMap = new Map(cards.map((c) => [c.id, c]));
          const nextSpreads = buildSqlBookSpreads(raw, activeCourseId as SqlCourseId, cMap, tachDeVaCode);
          setSqlCardsMap(cMap);
          setSqlLesson(raw);
          setLessonContent(null);
          if (pendingLastSpreadRef.current) {
            setSpreadIdx(Math.max(0, nextSpreads.length - 1));
            pendingLastSpreadRef.current = false;
          }
          setLessonLoading(false);
          return;
        } catch (err) {
          if (!alive) return;
          pendingLastSpreadRef.current = false;
          setLessonError({
            kind: 'server',
            message: err instanceof Error ? err.message : 'Không tải được dữ liệu bài học SQL.',
          });
          setLessonLoading(false);
          return;
        }
      }

      const res = await loadLessonContentWithAutoEnroll<StudioLesson>(
        activeCourseId,
        lessonNo,
        apiFetch,
      );
      if (!alive) return;

      if (res.ok) {
        const nextSpreads = buildBookSpreads(res.lesson, tachDeVaCode);
        setLessonContent(res.lesson);
        setSqlLesson(null);
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
  }, [activeCourseId, lessonNo, lessonReloadKey]);

  // Mở nhanh một đoạn mã từ Sách Bài học sang Laptop Bàn thí nghiệm
  const openCodeInIde = useCallback(
    (codeSnippet: string) => {
      try {
        sessionStorageOrNull()?.setItem(IDE_RELOAD_CODE_KEY, codeSnippet);
      } catch {}
      setIdeCustomCode(codeSnippet);
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
      activeCourseId,
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
  }, [activeCourseId, currentCatalog, doneLessons, lessonNo]);

  const handleRunSqlChallenge = useCallback(
    async (
      userSql: string,
      expectedSql: string,
      equivSql: string[],
      schema: SqlSchemaLike | undefined,
      relatedSchemas: SqlSchemaLike[],
      successMessage: string,
    ) => {
      if (sqlRunning) return;
      const grade = gradeSqlAnswer(userSql, expectedSql, equivSql);
      setSqlGradeResult((prev) => ({
        ...prev,
        [lessonKey]: {
          ok: grade.correct,
          text: grade.correct
            ? `${successMessage || grade.feedback || 'Chính xác!'}`
            : grade.error || 'Chưa khớp đáp án.',
          suggestion: grade.suggestion,
        },
      }));

      if (grade.correct) {
        void handleCompleteLesson();
      }

      const canPreviewSqlite =
        Boolean(schema?.columns?.length) &&
        /\bSELECT\b/i.test(userSql) &&
        !/\b(?:FUNCTION|PROCEDURE|TRIGGER|CALL|FOR\s+UPDATE)\b/i.test(userSql);

      if (!canPreviewSqlite) {
        setSqlSqlitePreview((prev) => ({ ...prev, [lessonKey]: null }));
        return;
      }

      setSqlRunning(true);
      try {
        let runner = pyRunnerRef.current;
        if (!runner) {
          runner = new PyodideRunner();
          pyRunnerRef.current = runner;
        }
        const script = buildSqlitePreviewScript(schema, relatedSchemas, userSql);
        const pyRes = await runner.run({
          code: script,
          tests: [],
          forbid: [],
          files: [],
          packages: [],
        });
        const parsed = pyRes ? parseSqlitePreviewOutput(pyRes.output || '') : null;
        if (parsed) {
          setSqlSqlitePreview((prev) => ({ ...prev, [lessonKey]: parsed }));
        } else if (pyRes?.error) {
          setSqlSqlitePreview((prev) => ({
            ...prev,
            [lessonKey]: {
              ok: false,
              columns: [],
              rows: [],
              rowCount: 0,
              error: pyRes.error,
            },
          }));
        }
      } catch {
        /* Không chặn việc chấm SQL nếu trình duyệt chưa nạp xong Pyodide */
      } finally {
        setSqlRunning(false);
      }
    },
    [handleCompleteLesson, lessonKey, sqlRunning],
  );

  /* ==========================================================================
     CHIA NỘI DUNG BÀI HỌC THẬT THÀNH CÁC CẶP TRANG SÁCH MỞ
     ========================================================================== */
  const spreads = useMemo(() => {
    if (isSql) {
      return sqlLesson
        ? buildSqlBookSpreads(sqlLesson, activeCourseId as SqlCourseId, sqlCardsMap, tachDeVaCode)
        : [];
    }
    return lessonContent ? buildBookSpreads(lessonContent, tachDeVaCode) : [];
  }, [isSql, sqlLesson, activeCourseId, sqlCardsMap, lessonContent]);
  const totalSpreads = Math.max(1, spreads.length);
  const safeSpreadIdx = Math.min(spreadIdx, totalSpreads - 1);
  const currentSpread = spreads[safeSpreadIdx] ?? null;

  const handleChangeLesson = useCallback(
    (nextIdx: number, targetSpread = 0) => {
      const clamped = Math.max(0, Math.min(catalogLessons.length - 1, nextIdx));
      if (targetSpread !== -1) {
        pendingLastSpreadRef.current = false;
        setSpreadIdx(Math.max(0, targetSpread));
      }
      setLessonIdx(clamped);
      if (typeof window !== 'undefined') {
        const url = `/lesson/${activeCourseId}?lesson=${clamped}`;
        window.history.pushState(null, '', url);
      }
    },
    [activeCourseId, catalogLessons.length],
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
    } else if (lessonIdx < catalogLessons.length - 1) {
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
              loading="lazy"
              decoding="async"
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
                loading="lazy"
                decoding="async"
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
                  {isSql
                    ? sqlLesson?.title || `${currentCatalog.code} · ${currentCatalog.title}`
                    : lessonContent?.title || `${currentCatalog.code} · ${currentCatalog.title}`}
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

      case 'sql-visual':
        return (
          <div className={styles.pageBodyFlow}>
            <p className={styles.pageSectionLabel}>{page.heading.toUpperCase()}</p>

            {page.entities.length > 0 && (
              <div className={styles.bookDiagramFrame}>
                <div className={styles.bookDiagramLaneTitle}>Sơ đồ bảng thực thể (ER)</div>
                <div className={styles.bookCardsGrid}>
                  {page.entities.map((ent, idx) => (
                    <div key={idx} className={styles.bookConceptCard}>
                      <h3 className={styles.bookConceptTitle}>📋 {ent.name}</h3>
                      <p className={styles.bookConceptDesc}>
                        {ent.columns
                          .map((c) => `${c.key ? `[${c.key}] ` : ''}${c.name}${c.type ? `: ${c.type}` : ''}`)
                          .join('\n')}
                      </p>
                    </div>
                  ))}
                </div>
                {page.diagramNote && <p className={styles.bookDiagramNote}>{renderInlineCode(page.diagramNote)}</p>}
              </div>
            )}

            {page.schema && page.schema.columns.length > 0 && (
              <div className={styles.bookTableWrap}>
                <table className={styles.bookTable}>
                  <thead>
                    <tr>
                      <th>Cột ({page.schema.table_name})</th>
                      <th>Kiểu</th>
                      <th>Khoá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.schema.columns.map((col, idx) => (
                      <tr key={idx}>
                        <td><code>{col.name}</code></td>
                        <td>{col.type || 'TEXT'}</td>
                        <td>{col.key ? <span className={styles.sqlKeyBadge}>{col.key}</span> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {page.dataPreview.length > 0 && page.schema && page.schema.columns.length > 0 && (
              <div className={styles.bookTableWrap}>
                <table className={styles.bookTable}>
                  <thead>
                    <tr>
                      {page.schema.columns.map((col, idx) => (
                        <th key={idx}>{col.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.dataPreview.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {page.schema!.columns.map((_, cIdx) => (
                          <td key={cIdx}>{row[cIdx] === null ? 'NULL' : String(row[cIdx] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {page.extraVisuals.map((ev, idx) => (
              <div key={idx} className={styles.bookCalloutNote}>
                <b>{ev.title}</b>
                {ev.caption && <div>{renderInlineCode(ev.caption)}</div>}
                {ev.query && (
                  <div className={styles.bookMcqCodeBox} style={{ marginTop: 6 }}>
                    {ev.query}
                  </div>
                )}
                {ev.highlights && ev.highlights.length > 0 && (
                  <ul className={styles.bookProcedureList} style={{ marginTop: 6 }}>
                    {ev.highlights.map((h, hIdx) => (
                      <li key={hIdx}>{renderInlineCode(h)}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {page.exampleNote && (
              <div className={styles.bookCalloutNote}>
                <b>QUAN SÁT NHANH</b>
                {renderInlineCode(page.exampleNote)}
              </div>
            )}
          </div>
        );

      case 'sql-minigame': {
        const mgPage: SqlMinigamePageSpec = page;
        const renderMinigameInteractive = () => {
          if (mgPage.gameType === 'classify' && mgPage.chips?.length && mgPage.bins?.length) {
            const pickedMap = sqlClassifyPick[lessonKey] ?? {};
            const activeChipId = sqlSelectedChip[lessonKey] ?? null;
            const unplaced = mgPage.chips.filter((c) => !pickedMap[c.id]);
            const result = sqlClassifyResult[lessonKey];
            return (
              <>
                <div className={styles.sqlChipGrid}>
                  {unplaced.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`${styles.sqlChipBtn} ${activeChipId === chip.id ? styles.sqlChipActive : ''}`}
                      onClick={() =>
                        setSqlSelectedChip((prev) => ({
                          ...prev,
                          [lessonKey]: prev[lessonKey] === chip.id ? null : chip.id,
                        }))
                      }
                    >
                      {chip.label}
                    </button>
                  ))}
                  {unplaced.length === 0 && (
                    <span className={styles.bookDiagramNote}>Đã xếp hết thẻ vào nhóm bên dưới.</span>
                  )}
                </div>

                <div className={styles.bookDiagramGrid}>
                  {mgPage.bins.map((bin) => {
                    const placedChips = mgPage.chips!.filter((c) => pickedMap[c.id] === bin.id);
                    return (
                      <div
                        key={bin.id}
                        role="button"
                        tabIndex={0}
                        className={`${styles.sqlZoneCard} ${activeChipId ? styles.sqlZoneCardActive : ''}`}
                        onClick={() => {
                          const targetChip = activeChipId ?? unplaced[0]?.id ?? null;
                          if (!targetChip) return;
                          setSqlClassifyPick((prev) => ({
                            ...prev,
                            [lessonKey]: { ...(prev[lessonKey] ?? {}), [targetChip]: bin.id },
                          }));
                          setSqlSelectedChip((prev) => ({ ...prev, [lessonKey]: null }));
                          setSqlClassifyResult((prev) => ({ ...prev, [lessonKey]: null }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            const targetChip = activeChipId ?? unplaced[0]?.id ?? null;
                            if (!targetChip) return;
                            setSqlClassifyPick((prev) => ({
                              ...prev,
                              [lessonKey]: { ...(prev[lessonKey] ?? {}), [targetChip]: bin.id },
                            }));
                            setSqlSelectedChip((prev) => ({ ...prev, [lessonKey]: null }));
                          }
                        }}
                      >
                        <div className={styles.bookDiagramLaneTitle}>{bin.label}</div>
                        <div className={styles.sqlChipGrid}>
                          {placedChips.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className={styles.sqlPlacedToken}
                              title="Bấm để bỏ chọn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSqlClassifyPick((prev) => {
                                  const next = { ...(prev[lessonKey] ?? {}) };
                                  delete next[c.id];
                                  return { ...prev, [lessonKey]: next };
                                });
                                setSqlClassifyResult((prev) => ({ ...prev, [lessonKey]: null }));
                              }}
                            >
                              {c.label} ×
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.bookActionRow}>
                  <button
                    type="button"
                    className={styles.bookPrimaryBtn}
                    onClick={() => {
                      const sol = mgPage.classifySolution ?? {};
                      const total = mgPage.chips!.length;
                      const matched = mgPage.chips!.filter((c) => pickedMap[c.id] === sol[c.id]).length;
                      setSqlClassifyResult((prev) => ({
                        ...prev,
                        [lessonKey]:
                          matched === total
                            ? { ok: true, msg: `✓ Chính xác hoàn toàn (${matched}/${total} thẻ)!` }
                            : { ok: false, msg: `Đúng ${matched}/${total} thẻ — thử bấm thẻ đặt nhầm để xếp lại.` },
                      }));
                    }}
                  >
                    Kiểm tra phân loại
                  </button>
                  <button
                    type="button"
                    className={styles.bookSecondaryBtn}
                    onClick={() => {
                      setSqlClassifyPick((prev) => ({ ...prev, [lessonKey]: {} }));
                      setSqlClassifyResult((prev) => ({ ...prev, [lessonKey]: null }));
                    }}
                  >
                    Làm lại
                  </button>
                </div>

                {result && (
                  <div className={result.ok ? styles.paperFeedback : styles.paperErrorFeedback}>
                    {result.msg}
                  </div>
                )}
              </>
            );
          }

          if (mgPage.gameType === 'match' && mgPage.pairs?.length) {
            const activeLeft = sqlMatchLeft[lessonKey] ?? null;
            const matchMap = sqlMatchPick[lessonKey] ?? {};
            const rightLabels = Array.from(
              new Map(mgPage.pairs.map((p) => [p.rightId, p.rightLabel])).entries(),
            );
            const result = sqlMatchResult[lessonKey];
            return (
              <>
                <div className={styles.sqlMatchGrid}>
                  <div className={styles.paperOptList}>
                    {mgPage.pairs.map((pair) => {
                      const pickedRightId = matchMap[pair.leftId];
                      const chosenRight = rightLabels.find(([rid]) => rid === pickedRightId)?.[1];
                      return (
                        <button
                          key={pair.leftId}
                          type="button"
                          className={`${styles.paperOptBtn} ${activeLeft === pair.leftId ? styles.sqlChipActive : ''}`}
                          onClick={() =>
                            setSqlMatchLeft((prev) => ({
                              ...prev,
                              [lessonKey]: prev[lessonKey] === pair.leftId ? null : pair.leftId,
                            }))
                          }
                        >
                          <span>{renderInlineCode(pair.left)}</span>
                          {chosenRight && <span className={styles.sqlKeyBadge}>{chosenRight}</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className={styles.paperOptList}>
                    {rightLabels.map(([rid, rlabel]) => (
                      <button
                        key={rid}
                        type="button"
                        className={styles.paperOptBtn}
                        onClick={() => {
                          const targetLeft =
                            activeLeft ?? mgPage.pairs!.find((p) => !matchMap[p.leftId])?.leftId ?? null;
                          if (!targetLeft) return;
                          setSqlMatchPick((prev) => ({
                            ...prev,
                            [lessonKey]: { ...(prev[lessonKey] ?? {}), [targetLeft]: rid },
                          }));
                          setSqlMatchLeft((prev) => ({ ...prev, [lessonKey]: null }));
                          setSqlMatchResult((prev) => ({ ...prev, [lessonKey]: null }));
                        }}
                      >
                        <span>{rlabel}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.bookActionRow}>
                  <button
                    type="button"
                    className={styles.bookPrimaryBtn}
                    onClick={() => {
                      const total = mgPage.pairs!.length;
                      const okCount = mgPage.pairs!.filter((p) => matchMap[p.leftId] === p.rightId).length;
                      setSqlMatchResult((prev) => ({
                        ...prev,
                        [lessonKey]:
                          okCount === total
                            ? { ok: true, msg: `✓ Ghép đúng toàn bộ ${total} cặp!` }
                            : { ok: false, msg: `Đúng ${okCount}/${total} cặp — chọn mục bên trái rồi bấm nhãn bên phải để sửa.` },
                      }));
                    }}
                  >
                    Kiểm tra ghép đôi
                  </button>
                  <button
                    type="button"
                    className={styles.bookSecondaryBtn}
                    onClick={() => {
                      setSqlMatchPick((prev) => ({ ...prev, [lessonKey]: {} }));
                      setSqlMatchResult((prev) => ({ ...prev, [lessonKey]: null }));
                    }}
                  >
                    Xoá chọn
                  </button>
                </div>
                {result && (
                  <div className={result.ok ? styles.paperFeedback : styles.paperErrorFeedback}>
                    {result.msg}
                  </div>
                )}
              </>
            );
          }

          if (mgPage.gameType === 'order' && mgPage.orderItems?.length) {
            const defaultIds = [...mgPage.orderItems.map((i) => i.id)].reverse();
            const currentOrder = sqlOrderList[lessonKey] ?? defaultIds;
            const itemMap = new Map(mgPage.orderItems.map((i) => [i.id, i.label]));
            const result = sqlOrderResult[lessonKey];
            const swapOrder = (from: number, to: number) => {
              const next = [...currentOrder];
              [next[from], next[to]] = [next[to], next[from]];
              setSqlOrderList((prev) => ({ ...prev, [lessonKey]: next }));
              setSqlOrderResult((prev) => ({ ...prev, [lessonKey]: null }));
            };
            return (
              <>
                <div className={styles.paperOptList}>
                  {currentOrder.map((id, idx) => (
                    <div key={id} className={styles.sqlOrderRow}>
                      <span>
                        <strong>{idx + 1}.</strong> {renderInlineCode(itemMap.get(id) || id)}
                      </span>
                      <div className={styles.sqlOrderMoves}>
                        <button
                          type="button"
                          className={styles.sqlMiniMoveBtn}
                          disabled={idx === 0}
                          onClick={() => swapOrder(idx, idx - 1)}
                          aria-label="Lên trên"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={styles.sqlMiniMoveBtn}
                          disabled={idx === currentOrder.length - 1}
                          onClick={() => swapOrder(idx, idx + 1)}
                          aria-label="Xuống dưới"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.bookActionRow}>
                  <button
                    type="button"
                    className={styles.bookPrimaryBtn}
                    onClick={() => {
                      const sol = mgPage.orderSolution ?? {};
                      const allRight = currentOrder.every((id, idx) => sol[id] === idx + 1);
                      setSqlOrderResult((prev) => ({
                        ...prev,
                        [lessonKey]: allRight
                          ? { ok: true, msg: '✓ Chính xác! Bạn đã sắp đúng trình tự.' }
                          : { ok: false, msg: 'Thứ tự chưa chuẩn — dùng nút ↑ / ↓ để đổi chỗ các bước.' },
                      }));
                    }}
                  >
                    Kiểm tra thứ tự
                  </button>
                </div>
                {result && (
                  <div className={result.ok ? styles.paperFeedback : styles.paperErrorFeedback}>
                    {result.msg}
                  </div>
                )}
              </>
            );
          }

          if (mgPage.gameType === 'bug_spot' && mgPage.bugCode) {
            const lines = mgPage.bugCode.split('\n');
            const pickedLine = sqlBugLine[lessonKey];
            const result = sqlBugResult[lessonKey];
            return (
              <>
                <div className={styles.bookCodeBox}>
                  {lines.map((lineText, idx) => {
                    const lineNo = idx + 1;
                    return (
                      <button
                        key={lineNo}
                        type="button"
                        className={`${styles.sqlLineBtn} ${pickedLine === lineNo ? styles.sqlLinePicked : ''}`}
                        onClick={() => {
                          setSqlBugLine((prev) => ({ ...prev, [lessonKey]: lineNo }));
                          setSqlBugResult((prev) => ({ ...prev, [lessonKey]: null }));
                        }}
                      >
                        <span style={{ opacity: 0.55, minWidth: 18 }}>{lineNo}</span>
                        <span>{lineText || ' '}</span>
                      </button>
                    );
                  })}
                </div>
                <div className={styles.bookActionRow}>
                  <button
                    type="button"
                    className={styles.bookPrimaryBtn}
                    onClick={() => {
                      if (!pickedLine) {
                        setSqlBugResult((prev) => ({
                          ...prev,
                          [lessonKey]: { ok: false, msg: 'Hãy bấm vào dòng code có lỗi trước.' },
                        }));
                        return;
                      }
                      const ok = pickedLine === mgPage.bugLine;
                      setSqlBugResult((prev) => ({
                        ...prev,
                        [lessonKey]: ok
                          ? { ok: true, msg: `✓ Chuẩn xác (dòng ${pickedLine})! ${mgPage.bugExplain || ''}` }
                          : { ok: false, msg: `Dòng ${pickedLine} chưa phải vị trí lỗi chính — thử chọn dòng khác.` },
                      }));
                    }}
                  >
                    Kiểm tra dòng lỗi
                  </button>
                </div>
                {result && (
                  <div className={result.ok ? styles.paperFeedback : styles.paperErrorFeedback}>
                    {result.msg}
                  </div>
                )}
              </>
            );
          }
          return null;
        };

        return (
          <div className={styles.pageBodyFlow}>
            <p className={styles.pageSectionLabel}>BÀI TẬP TƯ DUY NHANH</p>
            <h2 className={styles.pageMainTitle}>{mgPage.title}</h2>
            {mgPage.instruction && (
              <p className={styles.pageLeadParagraph}>{renderInlineCode(mgPage.instruction)}</p>
            )}
            {renderMinigameInteractive()}
            {mgPage.decompSummary && (
              <div className={styles.bookCalloutNote}>
                <b>{mgPage.decompSummary.ruleLabel}</b>
                {mgPage.decompSummary.rule && <div>{renderInlineCode(mgPage.decompSummary.rule)}</div>}
                {mgPage.decompSummary.targetTables.length > 0 && (
                  <ul className={styles.bookProcedureList} style={{ marginTop: 6 }}>
                    {mgPage.decompSummary.targetTables.map((t, idx) => (
                      <li key={idx}>
                        <strong>{t.name}</strong> ({t.columns.join(', ')})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'sql-builder-bank': {
        const zonesPage = currentSpread?.right.kind === 'sql-builder-zones' ? currentSpread.right : null;
        const placedByZone = sqlBuilderZones[lessonKey] ?? {};
        const showHintsOpen = Boolean(sqlBuilderHintsOpen[lessonKey]);
        return (
          <div className={styles.pageBodyFlow}>
            <p className={styles.pageSectionLabel}>NHIỆM VỤ GHÉP LỆNH</p>
            <h2 className={styles.pageMainTitle}>{page.heading}</h2>
            <p className={styles.pageLeadParagraph}>{renderInlineCode(page.mission)}</p>

            <div className={styles.bookDiagramFrame}>
              <div className={styles.bookDiagramLaneTitle}>Kho mảnh lệnh (bấm để đưa sang khung bên phải)</div>
              <div className={styles.sqlChipGrid}>
                {page.blocks.map((block, bIdx) => (
                  <button
                    key={block.id}
                    type="button"
                    className={styles.sqlChipBtn}
                    onClick={() => {
                      const activeZoneId =
                        sqlBuilderActiveZone[lessonKey] ||
                        zonesPage?.dropZones.find((z) => z.accepts.includes(block.type))?.id ||
                        zonesPage?.dropZones[0]?.id ||
                        'zone-1';
                      const curZone = placedByZone[activeZoneId] ?? [];
                      setSqlBuilderZones((prev) => ({
                        ...prev,
                        [lessonKey]: {
                          ...(prev[lessonKey] ?? {}),
                          [activeZoneId]: [
                            ...curZone,
                            { uid: `${block.id}-${bIdx}-${curZone.length}`, token: block.token, type: block.type },
                          ],
                        },
                      }));
                      setSqlBuilderResult((prev) => ({ ...prev, [lessonKey]: null }));
                    }}
                  >
                    {block.token}
                  </button>
                ))}
              </div>
            </div>

            {page.revealHints.length > 0 && (
              <>
                <div className={styles.bookActionRow}>
                  <button
                    type="button"
                    className={styles.bookSecondaryBtn}
                    onClick={() =>
                      setSqlBuilderHintsOpen((prev) => ({ ...prev, [lessonKey]: !prev[lessonKey] }))
                    }
                  >
                    {showHintsOpen ? 'Ẩn gợi ý ghép' : `💡 Gợi ý từng dòng (${page.revealHints.length})`}
                  </button>
                </div>
                {showHintsOpen && (
                  <div className={styles.bookCalloutNote}>
                    <b>GỢI Ý TỪNG DÒNG</b>
                    {page.revealHints.map((h, idx) => (
                      <div key={idx} style={{ marginTop: idx > 0 ? 4 : 0 }}>
                        <strong>{h.zoneId}:</strong> {renderInlineCode(h.text)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      case 'sql-builder-zones': {
        const placedByZone = sqlBuilderZones[lessonKey] ?? {};
        const activeZoneId = sqlBuilderActiveZone[lessonKey] || page.dropZones[0]?.id || '';
        const bResult = sqlBuilderResult[lessonKey];
        const showAns = Boolean(sqlBuilderAnsOpen[lessonKey]);
        const joinedSql = page.dropZones
          .map((z) => (placedByZone[z.id] ?? []).map((item) => item.token).join(' '))
          .filter(Boolean)
          .join(' ');
        return (
          <div className={styles.pageBodyFlow}>
            <p className={styles.pageSectionLabel}>KHUNG LẮP GHÉP SQL</p>
            <h2 className={styles.pageMainTitle}>{page.heading}</h2>

            {page.dropZones.map((zone) => {
              const items = placedByZone[zone.id] ?? [];
              const isActive = activeZoneId === zone.id;
              return (
                <div
                  key={zone.id}
                  role="button"
                  tabIndex={0}
                  className={`${styles.sqlZoneCard} ${isActive ? styles.sqlZoneCardActive : ''}`}
                  onClick={() => setSqlBuilderActiveZone((prev) => ({ ...prev, [lessonKey]: zone.id }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSqlBuilderActiveZone((prev) => ({ ...prev, [lessonKey]: zone.id }));
                    }
                  }}
                >
                  <div className={styles.sqlZonePlaceholder}>
                    {isActive ? '▶ ' : ''}
                    {zone.placeholder}
                  </div>
                  <div className={styles.sqlChipGrid}>
                    {items.length > 0 ? (
                      items.map((it) => (
                        <button
                          key={it.uid}
                          type="button"
                          className={styles.sqlPlacedToken}
                          title="Bấm để bỏ mảnh này"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSqlBuilderZones((prev) => ({
                              ...prev,
                              [lessonKey]: {
                                ...(prev[lessonKey] ?? {}),
                                [zone.id]: (prev[lessonKey]?.[zone.id] ?? []).filter((x) => x.uid !== it.uid),
                              },
                            }));
                            setSqlBuilderResult((prev) => ({ ...prev, [lessonKey]: null }));
                          }}
                        >
                          {it.token} ×
                        </button>
                      ))
                    ) : (
                      <span className={styles.bookDiagramNote}>Bấm để chọn vùng này rồi chọn mảnh bên trái</span>
                    )}
                  </div>
                </div>
              );
            })}

            {joinedSql && (
              <div className={styles.bookCodeBox}>{joinedSql};</div>
            )}

            <div className={styles.bookActionRow}>
              <button
                type="button"
                className={styles.bookPrimaryBtn}
                onClick={() => {
                  const res = gradeStep3Tokens(joinedSql, page.expectedSql);
                  setSqlBuilderResult((prev) => ({
                    ...prev,
                    [lessonKey]: { ok: res.correct, msg: res.message },
                  }));
                }}
              >
                ✓ Kiểm tra ghép lệnh
              </button>
              <button
                type="button"
                className={styles.bookSecondaryBtn}
                onClick={() => {
                  setSqlBuilderZones((prev) => ({ ...prev, [lessonKey]: {} }));
                  setSqlBuilderResult((prev) => ({ ...prev, [lessonKey]: null }));
                }}
              >
                Xoá hết
              </button>
              <button
                type="button"
                className={styles.bookSecondaryBtn}
                onClick={() => setSqlBuilderAnsOpen((prev) => ({ ...prev, [lessonKey]: !prev[lessonKey] }))}
              >
                {showAns ? 'Ẩn đáp án' : '👁️ Xem đáp án'}
              </button>
            </div>

            {bResult && (
              <div className={bResult.ok ? styles.paperFeedback : styles.paperErrorFeedback}>
                {bResult.msg}
              </div>
            )}
            {showAns && page.expectedSql && <div className={styles.bookCodeBox}>{page.expectedSql}</div>}
          </div>
        );
      }

      case 'sql-challenge-brief': {
        const revealedCount = sqlChallengeHintLevel[lessonKey] ?? 0;
        return (
          <div className={styles.pageBodyFlow}>
            <p className={styles.pageSectionLabel}>ĐỀ BÀI THỰC HÀNH</p>
            <h2 className={styles.pageMainTitle}>{page.heading}</h2>
            <p className={styles.pageLeadParagraph}>{renderInlineCode(page.prompt)}</p>

            {page.scenario && (
              <div className={styles.bookCalloutNote}>
                <b>TÌNH HUỐNG</b>
                {renderInlineCode(page.scenario)}
              </div>
            )}

            {page.steps.length > 0 && (
              <ol className={styles.bookProcedureList}>
                {page.steps.map((st, idx) => (
                  <li key={idx}>{renderInlineCode(st)}</li>
                ))}
              </ol>
            )}

            {page.example?.code && (
              <div className={styles.bookCalloutNote}>
                <b>VÍ DỤ THAM KHẢO</b>
                {page.example.question && <div>{renderInlineCode(page.example.question)}</div>}
                <div className={styles.bookMcqCodeBox} style={{ marginTop: 6 }}>
                  {page.example.code}
                </div>
                {page.example.output && <div style={{ marginTop: 4 }}>{renderInlineCode(page.example.output)}</div>}
              </div>
            )}

            {page.expectedText && (
              <div className={styles.bookCalloutNote}>
                <b>KẾT QUẢ MONG ĐỢI</b>
                {renderInlineCode(page.expectedText)}
              </div>
            )}

            {page.hints.length > 0 && (
              <>
                <div className={styles.bookActionRow}>
                  <button
                    type="button"
                    className={styles.bookSecondaryBtn}
                    onClick={() =>
                      setSqlChallengeHintLevel((prev) => ({
                        ...prev,
                        [lessonKey]: (prev[lessonKey] ?? 0) >= page.hints.length ? 0 : (prev[lessonKey] ?? 0) + 1,
                      }))
                    }
                  >
                    {revealedCount >= page.hints.length
                      ? 'Thu gọn gợi ý'
                      : `💡 Gợi ý (${revealedCount}/${page.hints.length})`}
                  </button>
                </div>
                {revealedCount > 0 && (
                  <div className={styles.bookCalloutNote}>
                    <b>GỢI Ý TỪNG MỨC</b>
                    {page.hints.slice(0, revealedCount).map((h, idx) => (
                      <div key={idx} style={{ marginTop: idx > 0 ? 4 : 0 }}>
                        <strong>Mức {h.level}:</strong> {renderInlineCode(h.text)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {page.conceptCardsAfter.length > 0 && (
              <div className={styles.bookActionRow}>
                {page.conceptCardsAfter.map((c) => (
                  <Link key={c.id} href={`/card/${c.id}`} className={styles.bookSecondaryBtn}>
                    📇 Đọc thêm: {c.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'sql-ide': {
        const currentSql = sqlEditorCode[lessonKey] ?? page.starter;
        const feedback = sqlGradeResult[lessonKey];
        const preview = sqlSqlitePreview[lessonKey];
        const showSol = Boolean(showSolution[lessonNo]);
        const schemas = [page.schema, ...page.relatedSchemas].filter((s): s is NonNullable<typeof s> => Boolean(s));
        return (
          <div className={styles.pageBodyFlow}>
            <p className={styles.pageSectionLabel}>
              {page.challengeType === 'bug_fix' ? 'SỬA LỖI TRUY VẤN' : 'THỰC THI & CHẤM SQL'}
            </p>
            <h2 className={styles.pageMainTitle}>{page.heading}</h2>

            {schemas.length > 0 && (
              <div className={styles.sqlChipGrid}>
                {schemas.map((sc, idx) => (
                  <span key={idx} className={styles.sqlKeyBadge}>
                    📋 {sc.table_name} ({sc.columns.map((c) => c.name).join(', ')})
                  </span>
                ))}
              </div>
            )}

            {page.challengeType === 'bug_fix' && page.buggyLine && (
              <p className={styles.bookDiagramNote}>
                Gợi ý vị trí: kiểm tra kỹ quanh dòng {page.buggyLine + 1}.
              </p>
            )}

            <textarea
              aria-label="Trình soạn thảo SQL"
              className={styles.sqlEditorTextarea}
              value={currentSql}
              onChange={(e) =>
                setSqlEditorCode((prev) => ({ ...prev, [lessonKey]: e.target.value }))
              }
              placeholder="Nhập câu lệnh SQL của bạn tại đây..."
              spellCheck={false}
            />

            <div className={styles.bookActionRow}>
              <button
                type="button"
                className={styles.bookPrimaryBtn}
                disabled={sqlRunning}
                onClick={() =>
                  void handleRunSqlChallenge(
                    currentSql,
                    page.expectedSql,
                    page.equivSql,
                    page.schema,
                    page.relatedSchemas,
                    page.successMessage,
                  )
                }
              >
                {sqlRunning ? '⏳ Đang chạy...' : '▶ Chạy & kiểm tra'}
              </button>

              {page.expectedSql && (
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
                  {showSol ? 'Ẩn đáp án' : '📖 Xem đáp án mẫu'}
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
                  : `✓ Đánh dấu xong (+${currentCatalog.xp} XP)`}
              </button>
            </div>

            {feedback && (
              <div className={feedback.ok ? styles.paperFeedback : styles.paperErrorFeedback}>
                <div>{renderInlineCode(feedback.text)}</div>
                {feedback.suggestion && (
                  <div style={{ marginTop: 4, opacity: 0.9 }}>{renderInlineCode(feedback.suggestion)}</div>
                )}
              </div>
            )}

            {preview && (
              preview.ok ? (
                <div className={styles.bookTableWrap}>
                  <table className={styles.bookTable}>
                    <thead>
                      <tr>
                        {preview.columns.map((col, idx) => (
                          <th key={idx}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.length > 0 ? (
                        preview.rows.map((r, rIdx) => (
                          <tr key={rIdx}>
                            {r.map((cell, cIdx) => (
                              <td key={cIdx}>{cell === null ? 'NULL' : String(cell)}</td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={Math.max(1, preview.columns.length)}>
                            (0 dòng trả về)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.bookDiagramNote}>
                  SQLite xem trước: {preview.error}
                </div>
              )
            )}

            {showSol && page.expectedSql && <div className={styles.bookCodeBox}>{page.expectedSql}</div>}
            {completeBanner && <div className={styles.paperFeedback}>{completeBanner}</div>}
          </div>
        );
      }

      case 'sql-fill': {
        const fb = sqlFillFeedback[lessonKey];
        const showSol = Boolean(showSolution[lessonNo]);
        return (
          <div className={styles.pageBodyFlow}>
            <p className={styles.pageSectionLabel}>HOÀN THIỆN MẪU CODE</p>
            <h2 className={styles.pageMainTitle}>{page.heading}</h2>

            <div className={styles.bookCodeBox}>{page.template}</div>

            {page.blanks.map((b, idx) => {
              const bKey = `${lessonKey}-blank-${b.id}`;
              return (
                <div key={b.id} className={styles.bookPracticeCard}>
                  <label htmlFor={bKey} style={{ fontSize: 12.5, fontWeight: 700, color: '#3a2e24' }}>
                    Chỗ trống #{idx + 1}: {renderInlineCode(b.hint)}
                  </label>
                  <input
                    id={bKey}
                    type="text"
                    className={styles.bookPracticeTextarea}
                    style={{ minHeight: 36, fontFamily: 'JetBrains Mono, monospace' }}
                    value={practiceInputs[bKey] ?? ''}
                    onChange={(e) => {
                      setPracticeInputs((prev) => ({ ...prev, [bKey]: e.target.value }));
                      setSqlFillFeedback((prev) => ({ ...prev, [lessonKey]: null }));
                    }}
                    placeholder="Nhập từ khoá còn thiếu..."
                  />
                </div>
              );
            })}

            <div className={styles.bookActionRow}>
              <button
                type="button"
                className={styles.bookPrimaryBtn}
                onClick={() => {
                  const okCount = page.blanks.filter((b) => {
                    const ans = (practiceInputs[`${lessonKey}-blank-${b.id}`] ?? '').trim().toLowerCase();
                    return ans === b.expected.trim().toLowerCase();
                  }).length;
                  const allOk = okCount === page.blanks.length;
                  setSqlFillFeedback((prev) => ({
                    ...prev,
                    [lessonKey]: allOk
                      ? { ok: true, msg: page.successMessage || '✓ Chính xác hoàn toàn!' }
                      : { ok: false, msg: `Đúng ${okCount}/${page.blanks.length} ô — kiểm tra lại ô còn sai nhé.` },
                  }));
                  if (allOk) void handleCompleteLesson();
                }}
              >
                ✓ Kiểm tra &amp; nộp bài
              </button>
              <button
                type="button"
                className={styles.bookSecondaryBtn}
                onClick={() => setShowSolution((prev) => ({ ...prev, [lessonNo]: !prev[lessonNo] }))}
              >
                {showSol ? 'Ẩn đáp án' : '👁️ Xem đáp án'}
              </button>
            </div>

            {showSol && (
              <div className={styles.bookCalloutNote}>
                <b>ĐÁP ÁN CÁC Ô TRỐNG</b>
                {page.blanks.map((b, i) => (
                  <div key={b.id}>
                    Ô #{i + 1}: <code>{b.expected}</code>
                  </div>
                ))}
              </div>
            )}
            {fb && (
              <div className={fb.ok ? styles.paperFeedback : styles.paperErrorFeedback}>{fb.msg}</div>
            )}
            {completeBanner && <div className={styles.paperFeedback}>{completeBanner}</div>}
          </div>
        );
      }

      case 'sql-mcq-challenge': {
        const cKey = `${lessonKey}-s4mcq`;
        const chosen = pickedMcq[cKey];
        const isAnswered = chosen !== undefined;
        const rightIdx = Math.max(
          0,
          page.options.findIndex((o) => o.correct),
        );
        return (
          <div className={styles.pageBodyFlow}>
            <p className={styles.pageSectionLabel}>TRẮC NGHIỆM CHỐT BÀI</p>
            <h2 className={styles.pageMainTitle}>{page.heading}</h2>
            <p className={styles.pageLeadParagraph}>{renderInlineCode(page.question)}</p>

            <div className={styles.paperOptList}>
              {page.options.map((opt, idx) => {
                let btnClass = styles.paperOptBtn;
                if (isAnswered && chosen === idx) {
                  btnClass += opt.correct ? ` ${styles.paperOptCorrect}` : ` ${styles.paperOptWrong}`;
                } else if (isAnswered && opt.correct) {
                  btnClass += ` ${styles.paperOptCorrect}`;
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    className={btnClass}
                    onClick={() => {
                      setPickedMcq((prev) => ({ ...prev, [cKey]: idx }));
                      if (idx === rightIdx) void handleCompleteLesson();
                    }}
                  >
                    <span>
                      <strong>{LETTERS[idx]}.</strong> {renderInlineCode(opt.text)}
                    </span>
                    {isAnswered && opt.correct && <span>✓</span>}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div className={chosen === rightIdx ? styles.paperFeedback : styles.paperErrorFeedback}>
                {renderInlineCode(
                  page.options[chosen]?.explanation ||
                    (chosen === rightIdx ? page.successMessage : 'Phương án này chưa chuẩn — xem đáp án xanh bên trên nhé.'),
                )}
              </div>
            )}
            {completeBanner && <div className={styles.paperFeedback}>{completeBanner}</div>}
          </div>
        );
      }
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
                      {catalogLessons.map((item, idx) => (
                        <option key={item.no} value={idx}>
                          {doneLessons.includes(item.no) ? '✓ ' : ''}
                          Bài {item.no}/{catalogLessons.length} · {item.code} · {item.title}
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
                    <span>
                      {isSql
                        ? SQL_COURSE_META[activeCourseId as SqlCourseId].title.toUpperCase()
                        : 'SỔ TAY NHÀ PHÁT MINH'}{' '}
                      · {currentCatalog.moduleShort}
                    </span>
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
                            ? `Bài học này chưa có trong khoá ${activeCourseId}. Vui lòng kiểm tra dữ liệu và bấm Thử lại.`
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
                      Bài {lessonNo} / {catalogLessons.length} ({currentCatalog.code})
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
             TRANG 2: BÀN THÍ NGHIỆM — MÁY TÍNH macOS TRÊN BÀN (public/goc-hoc/may-tinh)
             Nằm trong iframe để CSS/JS của nó không đụng scene.css; cùng origin nên Pyodide
             và localStorage dùng chung với phần còn lại của app.
             ------------------------------------------------------------------ */
          <div ref={shellRef} className={styles.laptopScreenShell}>
            <div className={styles.laptopCameraNotch} aria-hidden="true" />
            <iframe
              className={styles.macFrame}
              title="Máy tính Góc học"
              src={
                ideCustomCode === DEFAULT_IDE_CODE
                  ? '/goc-hoc/may-tinh/index.html'
                  : `/goc-hoc/may-tinh/index.html#code=${encodeURIComponent(ideCustomCode)}`
              }
            />
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

  const mainHeadingText =
    activeScreen === 'ide'
      ? 'Bàn thí nghiệm lập trình Python'
      : activeScreen === 'practice'
        ? 'Ôn tập hằng ngày'
        : `Bài ${lessonNo}: ${currentCatalog.title}`;

  return (
    <div className={styles.appRoot}>
      {/* Nền phòng Lofi mờ nhẹ (13 KB room-blur.webp) thay cho 80+ lớp ảnh bị che phía sau */}
      <div className={styles.roomBackdrop} aria-hidden="true" />
      <div className={styles.scrim} aria-hidden="true" />

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
            Laptop
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
              {doneLessons.length}/{catalogLessons.length}
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
      <main className={styles.stageContainer}>
        <h1 className={styles.srOnly}>{mainHeadingText}</h1>
        {stageContent}
      </main>
    </div>
  );
}
