'use client';

// S2 · Trắc nghiệm: một màn cho MỖI câu (scr.index trỏ vào step_2.mcq).
import CodeBlock from '@/components/lesson-chrome/exercises/CodeBlock';
import Mcq from '@/components/lesson-chrome/exercises/Mcq';
import { toCodeLines } from '@/lib/py-highlight';
import { correctIndex, letterKey, optionDetail, optionText, tachDeVaCode } from '@/lib/studio-lesson';

import { paragraphs, ScreenShell } from './chrome';
import type { LessonScreenProps } from './props';

type Props = Pick<
  LessonScreenProps,
  'lesson' | 'scr' | 'metaLabel' | 'draft' | 'update' | 'clearChecked' | 'checked' | 'verdict'
>;

export default function McqScreen({
  lesson,
  scr,
  metaLabel,
  draft,
  update,
  clearChecked,
  checked,
  verdict,
}: Props) {
  const i = scr.index ?? 0;
  const q = lesson.step_2?.mcq?.[i];
  if (!q) return null;
  // 471/1032 câu của gói mang một đoạn code mà đề bài TRỎ TỚI; build gấp nó vào
  // `question` và ở đây tách ra để dựng đúng loại. Nhồi chung vào tiêu đề thì
  // code dồn thành một dòng — xem `tachDeVaCode`.
  const { de, code } = tachDeVaCode(q.question);
  return (
    // `title` nhận ReactNode, nên câu hỏi phải đi qua `paragraphs` — 8 câu hỏi
    // của bản dựng có backtick và trước đây hiện ra nguyên dấu.
    <ScreenShell scr={scr} metaLabel={metaLabel} title={paragraphs(de)} verdict={verdict}>
      {code ? (
        // KHÔNG dùng `c.readCode` ở đây: `.readCode > div` đặt `margin-bottom: 0`
        // cho CodeBlock vì ở màn ĐỌC gap của `.read` đã lo khoảng cách. Màn trắc
        // nghiệm không có `.read`, nên mượn lớp ấy làm khối code dính LIỀN thẻ
        // phương án đầu tiên (đo: codeCard bottom 396, phương án A top 396 —
        // 0px) ở 471/1032 câu có đoạn code. `.codeCard` tự mang 16px; để nguyên.
        <div>
          <CodeBlock filename="python" langTag="đoạn code của câu hỏi" lines={toCodeLines(code)} />
        </div>
      ) : null}
      <Mcq
        options={q.options.map((o, oi) => ({
          key: letterKey(oi),
          label: optionText(o),
          sub: checked ? optionDetail(o) : undefined,
        }))}
        selected={draft.mcq[i] ?? null}
        onSelect={(key) => {
          clearChecked();
          update({ mcq: { ...draft.mcq, [i]: key } });
        }}
        correctKey={letterKey(correctIndex(q))}
        checked={checked}
      />
    </ScreenShell>
  );
}
