/**
 * lofi-book-spreads.ts — Chia nội dung một bài học `StudioLesson` thành các
 * cặp trang sách mở (trái + phải) linh hoạt cho `LofiWorkspace`.
 *
 * - Với giáo trình `pe-da` (179 bài có `step_1.read`): chia động 4–6 cặp trang
 *   theo độ dài bài (Đọc & Ví dụ → Trắc nghiệm → Tự luyện → Thử thách/Quy trình),
 *   giữ nguyên `sliceIndex` & `blockIndex` gốc để `maDeThu()` nối tiền tố code chính xác.
 * - Với giáo trình `pe-v4` cũ (không có `step_1.read`): giữ 3 cặp trang tương thích ngược.
 *
 * Không dùng alias `@/` để `node --test` chạy kiểm định 179/179 bài trực tiếp.
 */

import type {
  Mcq,
  PracticeItem,
  ReadBlock,
  Step1,
  Step4,
  StudioLesson,
} from './studio-lesson';

export type QuestionSplitter = (question: string) => { de: string; code?: string };

export type IndexedReadBlock = {
  block: ReadBlock;
  sliceIndex: number;
  blockIndex: number;
};

export type ParsedMcq = {
  mcqIndex: number;
  prompt: string;
  code?: string;
  raw: Mcq;
};

export type IndexedPracticeItem = {
  practiceIndex: number;
  item: PracticeItem;
};

export type SqlSchemaColumnSpec = {
  name: string;
  type?: string;
  key?: string;
  icon?: string;
};

export type SqlTableSchemaSpec = {
  table_name: string;
  columns: SqlSchemaColumnSpec[];
  data?: unknown[][];
};

export type SqlVisualPageSpec = {
  kind: 'sql-visual';
  tag: string;
  heading: string;
  entities: Array<{
    name: string;
    columns: Array<{ name: string; type?: string; key?: string }>;
  }>;
  diagramNote?: string;
  schema?: SqlTableSchemaSpec;
  dataPreview: unknown[][];
  extraVisuals: Array<{
    title: string;
    caption?: string;
    query?: string;
    highlights?: string[];
  }>;
  exampleNote?: string;
};

export type SqlMinigamePageSpec = {
  kind: 'sql-minigame';
  tag: string;
  heading: string;
  gameType: 'classify' | 'match' | 'order' | 'bug_spot';
  title: string;
  instruction?: string;
  chips?: Array<{ id: string; label: string }>;
  bins?: Array<{ id: string; label: string; correct?: string }>;
  classifySolution?: Record<string, string>;
  pairs?: Array<{ left: string; leftId: string; rightId: string; rightLabel: string }>;
  orderItems?: Array<{ id: string; label: string }>;
  orderSolution?: Record<string, number>;
  bugCode?: string;
  bugLine?: number;
  bugExplain?: string;
  decompSummary?: {
    ruleLabel: string;
    rule: string;
    sourceTableName: string;
    targetTables: Array<{ name: string; columns: string[]; pkNote?: string; fkNote?: string }>;
  };
};

export type SqlBuilderBankPageSpec = {
  kind: 'sql-builder-bank';
  tag: string;
  heading: string;
  mission: string;
  blocks: Array<{ id: string; type: string; token: string; slot?: string }>;
  revealHints: Array<{ zoneId: string; text: string }>;
};

export type SqlBuilderZonesPageSpec = {
  kind: 'sql-builder-zones';
  tag: string;
  heading: string;
  dropZones: Array<{ id: string; placeholder: string; accepts: string[]; multi?: boolean }>;
  expectedSql: string;
};

export type SqlChallengeBriefPageSpec = {
  kind: 'sql-challenge-brief';
  tag: string;
  heading: string;
  prompt: string;
  scenario?: string;
  realWorld?: string;
  steps: string[];
  example?: { question?: string; code?: string; output?: string };
  expectedText?: string;
  hintExplore?: string;
  schema?: SqlTableSchemaSpec;
  relatedSchemas: SqlTableSchemaSpec[];
  hints: Array<{ level: number; text: string }>;
  conceptCardsAfter: Array<{ id: string; title: string }>;
};

export type SqlIdeChallengePageSpec = {
  kind: 'sql-ide';
  tag: string;
  heading: string;
  challengeType: 'full_ide' | 'bug_fix';
  starter: string;
  buggyLine?: number;
  expectedSql: string;
  equivSql: string[];
  schema?: SqlTableSchemaSpec;
  relatedSchemas: SqlTableSchemaSpec[];
  successMessage: string;
  xpReward: number;
};

export type SqlFillChallengePageSpec = {
  kind: 'sql-fill';
  tag: string;
  heading: string;
  template: string;
  blanks: Array<{ id: string; hint: string; expected: string }>;
  successMessage: string;
  xpReward: number;
};

export type SqlMcqChallengePageSpec = {
  kind: 'sql-mcq-challenge';
  tag: string;
  heading: string;
  question: string;
  options: Array<{ text: string; correct: boolean; explanation?: string }>;
  successMessage: string;
  xpReward: number;
};

export type BookPageSpec =
  | {
      kind: 'read-slice';
      tag: string;
      heading: string;
      blocks: IndexedReadBlock[];
    }
  | {
      kind: 'mcq-page';
      tag: string;
      predict?: Step1['predict'];
      items: ParsedMcq[];
    }
  | {
      kind: 'practice-page';
      tag: string;
      items: IndexedPracticeItem[];
      totalPractice: number;
    }
  | {
      kind: 'challenge-spec';
      tag: string;
      step4: Step4;
      fallbackTaskBody?: string;
      extraPractice?: IndexedPracticeItem[];
    }
  | {
      kind: 'challenge-action';
      tag: string;
      step4: Step4;
    }
  | {
      kind: 'legacy';
      tag: string;
      legacySpreadIdx: 0 | 1 | 2;
      side: 'left' | 'right';
    }
  | SqlVisualPageSpec
  | SqlMinigamePageSpec
  | SqlBuilderBankPageSpec
  | SqlBuilderZonesPageSpec
  | SqlChallengeBriefPageSpec
  | SqlIdeChallengePageSpec
  | SqlFillChallengePageSpec
  | SqlMcqChallengePageSpec;

export type BookSpread = {
  id: string;
  sectionLabel: string;
  left: BookPageSpec;
  right: BookPageSpec;
};

function mapSlice(blocks: ReadBlock[], sliceIndex: number): IndexedReadBlock[] {
  return blocks.map((block, blockIndex) => ({ block, sliceIndex, blockIndex }));
}

function splitEvenly<T>(items: T[], parts: number): T[][] {
  if (parts <= 0 || items.length === 0) return [];
  const safeParts = Math.min(parts, items.length);
  const base = Math.floor(items.length / safeParts);
  const extra = items.length % safeParts;
  const result: T[][] = [];
  let cursor = 0;
  for (let i = 0; i < safeParts; i += 1) {
    const size = base + (i < extra ? 1 : 0);
    result.push(items.slice(cursor, cursor + size));
    cursor += size;
  }
  return result;
}

export function isBookPageNonEmpty(page: BookPageSpec): boolean {
  switch (page.kind) {
    case 'read-slice':
      return page.blocks.length > 0;
    case 'mcq-page':
      return Boolean(page.predict?.options?.length) || page.items.length > 0;
    case 'practice-page':
      return page.items.length > 0;
    case 'challenge-spec':
      return Boolean(
        page.step4.task?.body ||
          page.step4.task?.title ||
          page.step4.task?.io?.length ||
          page.step4.hints?.length ||
          page.step4.contract ||
          page.step4.dataFiles?.length ||
          page.fallbackTaskBody ||
          page.extraPractice?.length,
      );
    case 'challenge-action':
      return Boolean(
        page.step4.procedure?.length ||
          page.step4.starterCode ||
          page.step4.solutionCode ||
          page.step4.task?.title ||
          page.step4.task?.body,
      );
    case 'legacy':
      return true;
    case 'sql-visual':
      return Boolean(
        page.entities.length ||
          page.schema?.columns?.length ||
          page.dataPreview.length ||
          page.extraVisuals.length ||
          page.exampleNote,
      );
    case 'sql-minigame':
      return Boolean(
        page.chips?.length ||
          page.pairs?.length ||
          page.orderItems?.length ||
          page.bugCode ||
          page.decompSummary,
      );
    case 'sql-builder-bank':
      return Boolean(page.mission || page.blocks.length);
    case 'sql-builder-zones':
      return Boolean(page.dropZones.length || page.expectedSql);
    case 'sql-challenge-brief':
      return Boolean(page.prompt || page.scenario || page.steps.length);
    case 'sql-ide':
      return Boolean(page.expectedSql || page.starter);
    case 'sql-fill':
      return Boolean(page.template && page.blanks.length);
    case 'sql-mcq-challenge':
      return Boolean(page.question && page.options.length);
    default: {
      const _exhaustive: never = page;
      return Boolean(_exhaustive);
    }
  }
}

function buildLegacySpreads(): BookSpread[] {
  return [
    {
      id: 'legacy-0',
      sectionLabel: 'Lý thuyết & Sơ đồ',
      left: { kind: 'legacy', tag: 'LÝ THUYẾT', legacySpreadIdx: 0, side: 'left' },
      right: { kind: 'legacy', tag: 'SƠ ĐỒ & VÍ DỤ', legacySpreadIdx: 0, side: 'right' },
    },
    {
      id: 'legacy-1',
      sectionLabel: 'Đọc hiểu & Trắc nghiệm',
      left: { kind: 'legacy', tag: 'ĐỌC HIỂU', legacySpreadIdx: 1, side: 'left' },
      right: { kind: 'legacy', tag: 'TRẮC NGHIỆM', legacySpreadIdx: 1, side: 'right' },
    },
    {
      id: 'legacy-2',
      sectionLabel: 'Lắp ghép & Thử thách',
      left: { kind: 'legacy', tag: 'LẮP GHÉP MÃ', legacySpreadIdx: 2, side: 'left' },
      right: { kind: 'legacy', tag: 'THỬ THÁCH', legacySpreadIdx: 2, side: 'right' },
    },
  ];
}

export function buildBookSpreads(
  lesson: StudioLesson,
  splitQuestion?: QuestionSplitter,
): BookSpread[] {
  const readSlices = lesson.step_1?.read ?? [];
  if (!readSlices.length) {
    return buildLegacySpreads();
  }

  const spreads: BookSpread[] = [];

  const parsedMcqs: ParsedMcq[] = (lesson.step_2?.mcq ?? []).map((raw, idx) => {
    const { de, code } = splitQuestion ? splitQuestion(raw.question) : { de: raw.question };
    return {
      mcqIndex: idx,
      prompt: de,
      code,
      raw,
    };
  });

  const practiceAll: IndexedPracticeItem[] = (lesson.step_2?.practice ?? []).map(
    (item, idx) => ({
      practiceIndex: idx,
      item,
    }),
  );

  const step4: Step4 | undefined = lesson.step_4;
  const hasChallenge = Boolean(
    step4 &&
      (step4.task?.body ||
        step4.task?.title ||
        step4.starterCode ||
        step4.procedure?.length ||
        step4.solutionCode ||
        step4.tests?.length),
  );

  let mcqConsumed = 0;
  let practiceConsumed = 0;

  // 1. Các cặp trang Đọc & Lý thuyết (`step_1.read`)
  if (readSlices.length === 1) {
    const blocks = mapSlice(readSlices[0], 0);
    if (blocks.length >= 2) {
      const mid = Math.ceil(blocks.length / 2);
      spreads.push({
        id: 'read-0',
        sectionLabel: 'Lý thuyết & Ví dụ',
        left: {
          kind: 'read-slice',
          tag: 'LÝ THUYẾT · PHẦN 1',
          heading: 'Kiến thức cốt lõi',
          blocks: blocks.slice(0, mid),
        },
        right: {
          kind: 'read-slice',
          tag: 'VÍ DỤ · PHẦN 2',
          heading: 'Ví dụ & Thực hành đọc mã',
          blocks: blocks.slice(mid),
        },
      });
    } else if (parsedMcqs.length > 0) {
      mcqConsumed = 1;
      spreads.push({
        id: 'read-0',
        sectionLabel: 'Lý thuyết & Kiểm tra nhanh',
        left: {
          kind: 'read-slice',
          tag: 'LÝ THUYẾT',
          heading: 'Kiến thức cốt lõi',
          blocks,
        },
        right: {
          kind: 'mcq-page',
          tag: 'KIỂM TRA NHANH',
          items: [parsedMcqs[0]],
        },
      });
    } else {
      spreads.push({
        id: 'read-0',
        sectionLabel: 'Lý thuyết',
        left: {
          kind: 'read-slice',
          tag: 'LÝ THUYẾT',
          heading: 'Kiến thức cốt lõi',
          blocks,
        },
        right: hasChallenge && step4
          ? {
              kind: 'challenge-spec',
              tag: 'ĐỀ BÀI THỰC HÀNH',
              step4,
              fallbackTaskBody: lesson.step_1?.brief?.task,
            }
          : {
              kind: 'read-slice',
              tag: 'TÓM TẮT',
              heading: 'Nội dung chính',
              blocks,
            },
      });
    }
  } else {
    for (let i = 0; i < readSlices.length; i += 2) {
      const leftSlice = mapSlice(readSlices[i], i);
      if (i + 1 < readSlices.length) {
        const rightSlice = mapSlice(readSlices[i + 1], i + 1);
        spreads.push({
          id: `read-${i}`,
          sectionLabel: `Lý thuyết & Ví dụ (${i + 1}–${i + 2})`,
          left: {
            kind: 'read-slice',
            tag: `LÝ THUYẾT · PHẦN ${i + 1}`,
            heading: `Phần ${i + 1}/${readSlices.length}`,
            blocks: leftSlice,
          },
          right: {
            kind: 'read-slice',
            tag: `VÍ DỤ · PHẦN ${i + 2}`,
            heading: `Phần ${i + 2}/${readSlices.length}`,
            blocks: rightSlice,
          },
        });
      } else if (leftSlice.length >= 2) {
        const mid = Math.ceil(leftSlice.length / 2);
        spreads.push({
          id: `read-${i}`,
          sectionLabel: `Lý thuyết & Ví dụ (${i + 1})`,
          left: {
            kind: 'read-slice',
            tag: `LÝ THUYẾT · PHẦN ${i + 1}A`,
            heading: `Phần ${i + 1}/${readSlices.length} (tiếp)`,
            blocks: leftSlice.slice(0, mid),
          },
          right: {
            kind: 'read-slice',
            tag: `VÍ DỤ · PHẦN ${i + 1}B`,
            heading: `Phần ${i + 1}/${readSlices.length} (tiếp)`,
            blocks: leftSlice.slice(mid),
          },
        });
      } else {
        const remainingMcq = parsedMcqs.slice(mcqConsumed);
        const rightSpec: BookPageSpec =
          remainingMcq.length >= 3
            ? (() => {
                mcqConsumed += 1;
                return {
                  kind: 'mcq-page',
                  tag: 'CÂU HỎI #1',
                  items: [remainingMcq[0]],
                };
              })()
            : practiceAll.length > 0
              ? (() => {
                  practiceConsumed += 1;
                  return {
                    kind: 'practice-page',
                    tag: 'TỰ LUYỆN #1',
                    items: [practiceAll[0]],
                    totalPractice: practiceAll.length,
                  };
                })()
              : {
                  kind: 'read-slice',
                  tag: `TÓM TẮT · PHẦN ${i + 1}`,
                  heading: `Phần ${i + 1}/${readSlices.length}`,
                  blocks: leftSlice,
                };
        spreads.push({
          id: `read-${i}`,
          sectionLabel: `Lý thuyết (${i + 1})`,
          left: {
            kind: 'read-slice',
            tag: `LÝ THUYẾT · PHẦN ${i + 1}`,
            heading: `Phần ${i + 1}/${readSlices.length}`,
            blocks: leftSlice,
          },
          right: rightSpec,
        });
      }
    }
  }

  // 2. Cặp trang Trắc nghiệm (`step_2.mcq` + `step_1.predict`)
  const remainingMcqs = parsedMcqs.slice(mcqConsumed);
  const hasPredict = Boolean(lesson.step_1?.predict?.options?.length);
  if (remainingMcqs.length > 0 || hasPredict) {
    if (hasPredict && remainingMcqs.length > 0) {
      const mid = Math.floor(remainingMcqs.length / 2);
      spreads.push({
        id: 'mcq-0',
        sectionLabel: 'Dự đoán & Trắc nghiệm',
        left: {
          kind: 'mcq-page',
          tag: 'DỰ ĐOÁN & CỦNG CỐ',
          predict: lesson.step_1?.predict,
          items: remainingMcqs.slice(0, mid),
        },
        right: {
          kind: 'mcq-page',
          tag: 'TRẮC NGHIỆM',
          items: remainingMcqs.slice(mid),
        },
      });
    } else if (remainingMcqs.length >= 2) {
      const leftCount = remainingMcqs.length === 3 ? 1 : Math.ceil(remainingMcqs.length / 2);
      spreads.push({
        id: 'mcq-0',
        sectionLabel: 'Trắc nghiệm củng cố',
        left: {
          kind: 'mcq-page',
          tag: 'CÂU HỎI CỦNG CỐ',
          items: remainingMcqs.slice(0, leftCount),
        },
        right: {
          kind: 'mcq-page',
          tag: 'TRẮC NGHIỆM TIẾP',
          items: remainingMcqs.slice(leftCount),
        },
      });
    } else if (remainingMcqs.length === 1) {
      const sparePractice =
        practiceConsumed < practiceAll.length ? practiceAll[practiceConsumed++] : null;
      spreads.push({
        id: 'mcq-0',
        sectionLabel: 'Trắc nghiệm củng cố',
        left: {
          kind: 'mcq-page',
          tag: 'CÂU HỎI CỦNG CỐ',
          items: remainingMcqs,
        },
        right: sparePractice
          ? {
              kind: 'practice-page',
              tag: 'TỰ LUYỆN #1',
              items: [sparePractice],
              totalPractice: practiceAll.length,
            }
          : {
              kind: 'mcq-page',
              tag: 'TRẮC NGHIỆM',
              items: remainingMcqs,
            },
      });
    } else if (hasPredict) {
      const sparePractice =
        practiceConsumed < practiceAll.length ? practiceAll[practiceConsumed++] : null;
      spreads.push({
        id: 'mcq-0',
        sectionLabel: 'Dự đoán',
        left: {
          kind: 'mcq-page',
          tag: 'DỰ ĐOÁN KẾT QUẢ',
          predict: lesson.step_1?.predict,
          items: [],
        },
        right: sparePractice
          ? {
              kind: 'practice-page',
              tag: 'TỰ LUYỆN #1',
              items: [sparePractice],
              totalPractice: practiceAll.length,
            }
          : {
              kind: 'mcq-page',
              tag: 'DỰ ĐOÁN KẾT QUẢ',
              predict: lesson.step_1?.predict,
              items: [],
            },
      });
    }
  }

  // 3. Các cặp trang Tự luyện (`step_2.practice`)
  const remainingPractice = practiceAll.slice(practiceConsumed);
  let carryOverPractice: IndexedPracticeItem[] = [];

  if (remainingPractice.length >= 2) {
    const reservedChallenge = hasChallenge ? 1 : 0;
    const maxPracticeSpreads = Math.max(1, 6 - spreads.length - reservedChallenge);
    const desiredSpreads = remainingPractice.length >= 5 ? 2 : 1;
    const practiceSpreadCount = Math.min(desiredSpreads, maxPracticeSpreads);
    const totalPracticePages = practiceSpreadCount * 2;
    const chunks = splitEvenly(remainingPractice, totalPracticePages);

    for (let i = 0; i < chunks.length; i += 2) {
      const leftItems = chunks[i];
      const rightItems = chunks[i + 1];
      if (!rightItems) {
        carryOverPractice = leftItems;
        break;
      }
      const leftFirst = leftItems[0].practiceIndex + 1;
      const leftLast = leftItems[leftItems.length - 1].practiceIndex + 1;
      const rightFirst = rightItems[0].practiceIndex + 1;
      const rightLast = rightItems[rightItems.length - 1].practiceIndex + 1;
      const fmtRange = (a: number, b: number) => (a === b ? `#${a}` : `#${a}–${b}`);

      spreads.push({
        id: `practice-${i}`,
        sectionLabel: `Tự luyện ${fmtRange(leftFirst, rightLast)}`,
        left: {
          kind: 'practice-page',
          tag: `TỰ LUYỆN ${fmtRange(leftFirst, leftLast)}`,
          items: leftItems,
          totalPractice: practiceAll.length,
        },
        right: {
          kind: 'practice-page',
          tag: `TỰ LUYỆN ${fmtRange(rightFirst, rightLast)}`,
          items: rightItems,
          totalPractice: practiceAll.length,
        },
      });
    }
  } else if (remainingPractice.length === 1) {
    carryOverPractice = remainingPractice;
  }

  // 4. Cặp trang Thử thách & Hoàn thành (`step_4`)
  if (hasChallenge && step4) {
    const isProcedure = Boolean(step4.procedure?.length);
    spreads.push({
      id: 'challenge-0',
      sectionLabel: isProcedure ? 'Quy trình & Hoàn thành' : 'Thử thách & Hoàn thành',
      left: {
        kind: 'challenge-spec',
        tag: isProcedure ? 'YÊU CẦU & MÔI TRƯỜNG' : 'ĐỀ BÀI THỰC HÀNH',
        step4,
        fallbackTaskBody: lesson.step_1?.brief?.task,
        extraPractice: carryOverPractice.length ? carryOverPractice : undefined,
      },
      right: {
        kind: 'challenge-action',
        tag: isProcedure ? 'QUY TRÌNH TRÊN MÁY' : 'THỬ THÁCH & LƯU TIẾN ĐỘ',
        step4,
      },
    });
  } else if (carryOverPractice.length > 0) {
    const first = carryOverPractice[0];
    const rest = carryOverPractice.slice(1);
    spreads.push({
      id: 'practice-final',
      sectionLabel: 'Tự luyện',
      left: {
        kind: 'practice-page',
        tag: 'TỰ LUYỆN',
        items: [first],
        totalPractice: practiceAll.length,
      },
      right: {
        kind: 'practice-page',
        tag: 'TỰ LUYỆN',
        items: rest.length ? rest : [first],
        totalPractice: practiceAll.length,
      },
    });
  }

  return spreads;
}
