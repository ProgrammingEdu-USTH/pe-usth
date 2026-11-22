/**
 * lofi-sql-adapter.ts — Chuyển đổi dữ liệu 66 bài SQL (`db_design`, `db_design_tc`, `db_design_nc`)
 * sang mảng `BookSpread[]` dùng chung giao diện sách mở của `LofiWorkspace`.
 *
 * Không import `@/` để `node --test` kiểm định thẳng 66/66 bài.
 */

import type { QuestionSplitter } from './lofi-book-spreads';
import type {
  BookPageSpec,
  BookSpread,
  ParsedMcq,
  SqlBuilderBankPageSpec,
  SqlBuilderZonesPageSpec,
  SqlChallengeBriefPageSpec,
  SqlFillChallengePageSpec,
  SqlIdeChallengePageSpec,
  SqlMcqChallengePageSpec,
  SqlMinigamePageSpec,
  SqlTableSchemaSpec,
  SqlVisualPageSpec,
} from './lofi-book-spreads';
import type { Mcq, McqOption, ReadBlock } from './studio-lesson';

export const SQL_COURSE_IDS = ['db_design', 'db_design_tc', 'db_design_nc'] as const;
export type SqlCourseId = (typeof SQL_COURSE_IDS)[number];

export function isSqlCourse(courseId: string): courseId is SqlCourseId {
  return (SQL_COURSE_IDS as readonly string[]).includes(courseId);
}

export type RawSqlLesson = {
  id: string;
  index?: number;
  title: string;
  subtitle?: string;
  story?: string;
  module?: number;
  module_title?: string;
  estimated_minutes?: number;
  xp_reward?: number;
  challenge_type?: string;
  concept_cards_after?: string[];
  boss?: {
    code?: string;
    cases?: Array<{ tag?: string; title?: string; suspect?: string; brief?: string }>;
  };
  step_1?: {
    intro?: string;
    mission?: string;
    primer?: {
      intro?: string;
      goal?: string[];
      example?: string;
    };
    concept_cards?: Array<{ icon?: string; title?: string; body?: string }>;
    visual?: {
      diagram?: {
        note?: string;
        entities?: Array<{
          name: string;
          columns?: Array<{ name: string; type?: string; key?: string }>;
        }>;
      };
      schema?: SqlTableSchemaSpec;
      data_preview?: unknown[][];
    };
    [extraVisualKey: string]: unknown;
  };
  step_2?: {
    mcq?: Array<{
      question: string;
      options: Array<{ id?: string; text: string; correct?: boolean; explanation?: string }>;
    }>;
    mini_game?: {
      type?: 'classify' | 'match' | 'order' | 'bug_spot';
      title?: string;
      instruction?: string;
      chips?: Array<{ id: string; label: string }>;
      bins?: Array<{ id: string; label: string; correct?: string }>;
      solution?: Record<string, string | number>;
      pairs?: Array<{ left: string; leftId?: string; rightId?: string; right?: { id?: string; label?: string } }>;
      items?: Array<{ id: string; label: string }>;
      code?: string;
      bugs?: Array<{ line?: number; description?: string }>;
    };
    decomp_game?: {
      rule_label?: string;
      rule?: string;
      source_table?: { name?: string };
      target_tables?: Array<{
        name: string;
        columns?: Array<{ name: string } | string>;
        pk?: string;
        fk?: string;
      }>;
    };
  };
  step_3?: {
    mission?: string;
    blocks?: Array<{ type: string; token: string; slot?: string }>;
    drop_zones?: Array<{ id: string; placeholder?: string; accepts?: string[]; multi?: boolean }>;
    expected_sql?: string;
    reveal_hints?: Record<string, string>;
  };
  step_4?: {
    prompt?: string;
    challenge_type?: 'full_ide' | 'fill_blank' | 'mcq_code' | 'bug_fix';
    context?: {
      scenario?: string;
      real_world?: string;
      steps?: string[];
      hint_explore?: string;
      example?: { question?: string; sql?: string; sample_output?: string };
      expected?: string;
    };
    schema?: SqlTableSchemaSpec;
    related_schemas?: SqlTableSchemaSpec[];
    starter?: string;
    starter_code?: string;
    buggy?: string;
    buggy_line?: number;
    expected_sql?: string;
    equiv_sql?: string | string[];
    template?: string;
    blanks?: Array<{ id?: string; hint?: string; expected: string }>;
    options?: Array<{ text: string; correct?: boolean; explanation?: string }>;
    hints?: Array<{ level?: number; text: string }>;
    success_message?: string;
    xp_reward?: number;
  };
};

export type SqlConceptCard = {
  id: string;
  eyebrow?: string;
  title: string;
  accent?: string;
  intro?: string;
  sections?: Array<{ icon?: string; heading: string; body: string; variant?: string; source?: string }>;
  quiz?: {
    question: string;
    options: Array<{
      label?: string;
      text?: string;
      correct?: boolean;
      feedback?: string;
      explanation?: string;
    }>;
  };
  source?: string;
  cta?: { label: string; href: string };
  courseId?: SqlCourseId;
  back_href?: string;
};

/**
 * Làm sạch HTML nhúng trong dữ liệu SQL thành văn bản thuần + inline code `` `...` ``.
 * Chỉ xoá thẻ HTML thực sự (`</?[a-zA-Z]...>`), giữ nguyên toán tử SQL như `< 100`.
 */
export function stripSqlHtml(raw?: string): string {
  if (!raw) return '';
  let text = String(raw);

  // Chuyển <code ...>...</code> -> `...` để LofiWorkspace tô màu inline code
  text = text.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, inner: string) => {
    const cleanInner = inner.replace(/<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[^>]*)?\s*\/?>/g, '');
    return `\`${cleanInner}\``;
  });

  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n');
  text = text.replace(/<li\b[^>]*>/gi, '• ');
  text = text.replace(/<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[^>]*)?\s*\/?>/g, '');

  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function defaultSplitQuestion(q: string): { de: string; code?: string } {
  const cleaned = stripSqlHtml(q);
  const idx = cleaned.indexOf('```');
  if (idx !== -1) {
    return {
      de: cleaned.slice(0, idx).trim(),
      code: cleaned.slice(idx).replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim(),
    };
  }
  return { de: cleaned };
}

function extractExtraVisuals(
  step1: RawSqlLesson['step_1'],
): SqlVisualPageSpec['extraVisuals'] {
  if (!step1) return [];
  const out: SqlVisualPageSpec['extraVisuals'] = [];
  for (const [key, val] of Object.entries(step1)) {
    if (key === 'visual' || !key.endsWith('_visual') || !val || typeof val !== 'object') {
      continue;
    }
    const obj = val as Record<string, unknown>;
    const title = stripSqlHtml(typeof obj.eyebrow === 'string' ? obj.eyebrow : key.replace('_visual', '').toUpperCase());
    const caption = typeof obj.caption === 'string' ? stripSqlHtml(obj.caption) : undefined;
    const query = typeof obj.query === 'string' ? obj.query.trim() : undefined;
    const highlights: string[] = [];
    if (Array.isArray(obj.trees)) {
      for (const t of obj.trees as Array<Record<string, unknown>>) {
        if (typeof t?.name === 'string') {
          const note = typeof t.note === 'string' ? ` — ${stripSqlHtml(t.note)}` : '';
          highlights.push(`${t.chosen ? '✓ ' : ''}${stripSqlHtml(t.name)}${note}`);
        }
      }
    }
    if (title || caption || query || highlights.length) {
      out.push({ title, caption, query, highlights });
    }
  }
  return out;
}

export function buildSqlBookSpreads(
  lesson: RawSqlLesson,
  _courseId: SqlCourseId,
  cardMap?: Map<string, SqlConceptCard>,
  splitQuestion: QuestionSplitter = defaultSplitQuestion,
): BookSpread[] {
  const s1 = lesson.step_1 ?? {};
  const s2 = lesson.step_2 ?? {};
  const s3 = lesson.step_3 ?? {};
  const s4 = lesson.step_4 ?? {};

  // ── SPREAD 0: LÝ THUYẾT & DỮ LIỆU MẪU (dùng lại read-slice bên trái + sql-visual bên phải) ──
  const leftBlocks: ReadBlock[] = [];
  const pushParagraph = (text: string) => {
    const clean = text.trim();
    if (clean) leftBlocks.push({ type: 'paragraph', text: clean });
  };

  if (lesson.story) {
    const storyClean = stripSqlHtml(lesson.story);
    if (storyClean) pushParagraph(`Bối cảnh: ${storyClean}`);
  }
  const introBody = stripSqlHtml(s1.primer?.intro || s1.intro || lesson.subtitle || '');
  if (introBody) {
    pushParagraph(introBody);
  }
  if (s1.primer?.goal?.length) {
    for (const g of s1.primer.goal) {
      const cleanGoal = stripSqlHtml(g);
      if (cleanGoal) pushParagraph(`• ${cleanGoal}`);
    }
  }
  if (s1.concept_cards?.length) {
    for (const card of s1.concept_cards) {
      const cardTitle = stripSqlHtml(card.title);
      const cardBody = stripSqlHtml(card.body);
      if (cardTitle && cardBody) {
        pushParagraph(`${cardTitle}: ${cardBody}`);
      } else if (cardTitle || cardBody) {
        pushParagraph(cardTitle || cardBody);
      }
    }
  }
  if (leftBlocks.length === 0) {
    pushParagraph(stripSqlHtml(lesson.title));
  }

  const spread0Left: BookPageSpec = {
    kind: 'read-slice',
    tag: `BƯỚC 1 · ${lesson.module_title || 'LÝ THUYẾT'}`,
    heading: stripSqlHtml(lesson.title),
    blocks: leftBlocks.map((block, blockIndex) => ({ block, sliceIndex: 0, blockIndex })),
  };

  const visual = s1.visual ?? {};
  const entities = (visual.diagram?.entities ?? []).map((e) => ({
    name: e.name,
    columns: (e.columns ?? []).map((c) => ({ name: c.name, type: c.type, key: c.key })),
  }));
  const fallbackSchema = visual.schema ?? s4.schema;
  const fallbackData = Array.isArray(visual.data_preview)
    ? visual.data_preview
    : Array.isArray(fallbackSchema?.data)
      ? fallbackSchema.data
      : [];
  const extraVisuals = extractExtraVisuals(s1);

  const spread0Right: SqlVisualPageSpec = {
    kind: 'sql-visual',
    tag: 'CẤU TRÚC & DỮ LIỆU MẪU',
    heading: fallbackSchema?.table_name ? `Bảng ${fallbackSchema.table_name}` : 'Trực quan dữ liệu',
    entities,
    diagramNote: visual.diagram?.note ? stripSqlHtml(visual.diagram.note) : undefined,
    schema: fallbackSchema
      ? {
          table_name: fallbackSchema.table_name,
          columns: fallbackSchema.columns ?? [],
          data: fallbackData,
        }
      : undefined,
    dataPreview: fallbackData.slice(0, 8),
    extraVisuals,
    exampleNote: s1.primer?.example ? stripSqlHtml(s1.primer.example) : undefined,
  };
  if (!spread0Right.entities.length && !spread0Right.schema && !spread0Right.extraVisuals.length && !spread0Right.exampleNote) {
    spread0Right.exampleNote = stripSqlHtml(s1.mission || lesson.subtitle || lesson.title);
  }

  // ── SPREAD 1: TRẮC NGHIỆM (tái sử dụng mcq-page) & MINI-GAME ──
  const parsedMcqs: ParsedMcq[] = (s2.mcq ?? []).map((q, idx) => {
    const cleanQ = stripSqlHtml(q.question);
    const { de, code } = splitQuestion(cleanQ);
    const opts: McqOption[] = (q.options ?? []).map((o) => ({
      text: stripSqlHtml(o.text),
      correct: Boolean(o.correct),
      ...(o.explanation ? { detail: stripSqlHtml(o.explanation) } : {}),
    }));
    const correctIdx = Math.max(
      0,
      (q.options ?? []).findIndex((o) => Boolean(o.correct)),
    );
    const getDetail = (opt: McqOption | undefined) =>
      opt && typeof opt === 'object' ? opt.detail || '' : '';
    const rawMcq: Mcq = {
      question: cleanQ,
      options: opts,
      correct: correctIdx,
      explanation: getDetail(opts[correctIdx]) || opts.map(getDetail).find(Boolean) || '',
    };
    return {
      mcqIndex: idx,
      prompt: de,
      code,
      raw: rawMcq,
    };
  });

  const spread1Left: BookPageSpec = {
    kind: 'mcq-page',
    tag: 'BƯỚC 2 · TRẮC NGHIỆM NHANH',
    items: parsedMcqs,
  };

  const mg = s2.mini_game;
  const rawType = mg?.type || (mg?.bins ? 'classify' : 'classify');
  const gameType: SqlMinigamePageSpec['gameType'] =
    rawType === 'match' || rawType === 'order' || rawType === 'bug_spot' ? rawType : 'classify';

  const spread1Right: SqlMinigamePageSpec = {
    kind: 'sql-minigame',
    tag: 'THỰC HÀNH NHANH',
    heading: stripSqlHtml(mg?.title || 'Kiểm tra tư duy nhanh'),
    gameType,
    title: stripSqlHtml(mg?.title || 'Luyện tập nhanh'),
    instruction: mg?.instruction ? stripSqlHtml(mg.instruction) : undefined,
    chips: mg?.chips?.map((c) => ({ id: c.id, label: stripSqlHtml(c.label) })),
    bins: mg?.bins?.map((b) => ({ id: b.id, label: stripSqlHtml(b.label), correct: b.correct })),
    classifySolution: mg?.solution
      ? Object.fromEntries(Object.entries(mg.solution).map(([k, v]) => [k, String(v)]))
      : undefined,
    pairs: mg?.pairs?.map((p, idx) => ({
      left: stripSqlHtml(p.left),
      leftId: p.leftId || `l_${idx}`,
      rightId: p.rightId || p.right?.id || `r_${idx}`,
      rightLabel: stripSqlHtml(p.right?.label || p.rightId || ''),
    })),
    orderItems: mg?.items?.map((it) => ({ id: it.id, label: stripSqlHtml(it.label) })),
    orderSolution:
      gameType === 'order' && mg?.solution
        ? Object.fromEntries(Object.entries(mg.solution).map(([k, v]) => [k, Number(v)]))
        : undefined,
    bugCode: mg?.code,
    bugLine: mg?.bugs?.[0]?.line,
    bugExplain: mg?.bugs?.[0]?.description ? stripSqlHtml(mg.bugs[0].description) : undefined,
    decompSummary: s2.decomp_game
      ? {
          ruleLabel: stripSqlHtml(s2.decomp_game.rule_label || 'Tách bảng chuẩn hoá'),
          rule: stripSqlHtml(s2.decomp_game.rule || ''),
          sourceTableName: s2.decomp_game.source_table?.name || '',
          targetTables: (s2.decomp_game.target_tables ?? []).map((t) => ({
            name: t.name,
            columns: (t.columns ?? []).map((c) => (typeof c === 'string' ? c : c.name)),
            pkNote: t.pk,
            fkNote: t.fk,
          })),
        }
      : undefined,
  };

  // ── SPREAD 2: GHÉP CÂU LỆNH SQL (BƯỚC 3) ──
  const revealHints = Object.entries(s3.reveal_hints ?? {}).map(([zoneId, text]) => ({
    zoneId,
    text: stripSqlHtml(text),
  }));

  const spread2Left: SqlBuilderBankPageSpec = {
    kind: 'sql-builder-bank',
    tag: 'BƯỚC 3 · KHO MẢNH LỆNH SQL',
    heading: 'Lắp ghép câu truy vấn',
    mission: stripSqlHtml(s3.mission || s1.mission || 'Chọn mảnh lệnh theo đúng thứ tự để tạo câu SQL hoàn chỉnh.'),
    blocks: (s3.blocks ?? []).map((b, idx) => ({
      id: `${b.slot || b.type}_${idx}`,
      type: b.type,
      token: b.token,
      slot: b.slot,
    })),
    revealHints,
  };

  const spread2Right: SqlBuilderZonesPageSpec = {
    kind: 'sql-builder-zones',
    tag: 'KHUNG GHÉP CÂU LỆNH',
    heading: 'Câu SQL bạn đã ghép',
    dropZones: (s3.drop_zones ?? []).map((z) => ({
      id: z.id,
      placeholder: z.placeholder || z.id,
      accepts: z.accepts ?? [],
      multi: z.multi,
    })),
    expectedSql: s3.expected_sql || '',
  };

  // ── SPREAD 3: THỬ THÁCH THỰC HÀNH (BƯỚC 4) ──
  const cardsAfter = (lesson.concept_cards_after ?? []).map((cid) => ({
    id: cid,
    title: cardMap?.get(cid)?.title || cid,
  }));

  const spread3Left: SqlChallengeBriefPageSpec = {
    kind: 'sql-challenge-brief',
    tag: 'BƯỚC 4 · THỬ THÁCH THỰC HÀNH',
    heading: lesson.boss?.cases?.[3]?.title ? stripSqlHtml(lesson.boss.cases[3].title) : 'Yêu cầu thực hành',
    prompt: stripSqlHtml(s4.prompt || 'Hoàn thành thử thách dưới đây để kết thúc bài học.'),
    scenario: s4.context?.scenario ? stripSqlHtml(s4.context.scenario) : undefined,
    realWorld: s4.context?.real_world ? stripSqlHtml(s4.context.real_world) : undefined,
    steps: (s4.context?.steps ?? []).map((st) => stripSqlHtml(st)),
    example: s4.context?.example
      ? {
          question: s4.context.example.question ? stripSqlHtml(s4.context.example.question) : undefined,
          code: s4.context.example.sql,
          output: s4.context.example.sample_output ? stripSqlHtml(s4.context.example.sample_output) : undefined,
        }
      : undefined,
    expectedText: s4.context?.expected ? stripSqlHtml(s4.context.expected) : undefined,
    hintExplore: s4.context?.hint_explore ? stripSqlHtml(s4.context.hint_explore) : undefined,
    schema: s4.schema,
    relatedSchemas: s4.related_schemas ?? [],
    hints: (s4.hints ?? []).map((h, i) => ({
      level: Number(h.level ?? i + 1),
      text: stripSqlHtml(h.text),
    })),
    conceptCardsAfter: cardsAfter,
  };

  const rawChallengeType = s4.challenge_type || lesson.challenge_type || 'full_ide';
  const xpReward = Number(s4.xp_reward ?? lesson.xp_reward ?? 50);
  const successMessage = stripSqlHtml(s4.success_message || 'Bạn đã hoàn thành bài học SQL!');

  let spread3Right:
    | SqlIdeChallengePageSpec
    | SqlFillChallengePageSpec
    | SqlMcqChallengePageSpec;

  if (rawChallengeType === 'fill_blank' && s4.template && s4.blanks?.length) {
    spread3Right = {
      kind: 'sql-fill',
      tag: 'ĐIỀN CHỖ TRỐNG',
      heading: 'Hoàn thiện đoạn mã',
      template: s4.template,
      blanks: s4.blanks.map((b, idx) => ({
        id: b.id || `b${idx + 1}`,
        hint: stripSqlHtml(b.hint || `Chỗ trống ${idx + 1}`),
        expected: b.expected,
      })),
      successMessage,
      xpReward,
    };
  } else if (rawChallengeType === 'mcq_code' && s4.options?.length) {
    spread3Right = {
      kind: 'sql-mcq-challenge',
      tag: 'CHỌN ĐÁP ÁN ĐÚNG',
      heading: 'Kiểm tra hiểu biết',
      question: stripSqlHtml(s4.prompt || 'Chọn phương án đúng nhất:'),
      options: s4.options.map((o) => ({
        text: stripSqlHtml(o.text),
        correct: Boolean(o.correct),
        explanation: o.explanation ? stripSqlHtml(o.explanation) : undefined,
      })),
      successMessage,
      xpReward,
    };
  } else {
    const equivList = Array.isArray(s4.equiv_sql)
      ? s4.equiv_sql.filter(Boolean)
      : s4.equiv_sql
        ? [s4.equiv_sql]
        : [];
    const challengeKind: 'full_ide' | 'bug_fix' = rawChallengeType === 'bug_fix' ? 'bug_fix' : 'full_ide';
    spread3Right = {
      kind: 'sql-ide',
      tag: challengeKind === 'bug_fix' ? 'SỬA LỖI TRUY VẤN' : 'TRÌNH SOẠN THẢO SQL',
      heading: challengeKind === 'bug_fix' ? 'Tìm và sửa dòng truy vấn lỗi' : 'Viết và chạy thử câu SQL',
      challengeType: challengeKind,
      starter:
        challengeKind === 'bug_fix'
          ? (s4.buggy || s4.starter || s4.starter_code || '')
          : (s4.starter || s4.starter_code || ''),
      buggyLine: s4.buggy_line,
      expectedSql: s4.expected_sql || '',
      equivSql: equivList,
      schema: s4.schema ?? visual.schema,
      relatedSchemas: s4.related_schemas ?? [],
      successMessage,
      xpReward,
    };
  }

  return [
    {
      id: `${lesson.id}-step-1`,
      sectionLabel: 'Lý thuyết & Mẫu bảng',
      left: spread0Left,
      right: spread0Right,
    },
    {
      id: `${lesson.id}-step-2`,
      sectionLabel: 'Trắc nghiệm & Luyện nhanh',
      left: spread1Left,
      right: spread1Right,
    },
    {
      id: `${lesson.id}-step-3`,
      sectionLabel: 'Ghép câu lệnh SQL',
      left: spread2Left,
      right: spread2Right,
    },
    {
      id: `${lesson.id}-step-4`,
      sectionLabel: 'Thử thách thực hành',
      left: spread3Left,
      right: spread3Right,
    },
  ];
}
