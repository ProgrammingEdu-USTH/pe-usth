import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  DedupIndex,
  cleanMcq,
  contentHash,
  ruleA1Schema,
  ruleA2SingleAnswer,
  ruleA3OptionText,
  ruleA4Explained,
  ruleA5NoLeak,
  ruleA7Tagged,
  runMcqFilters,
  type Mcq,
} from './mcq-filters';

/**
 * Fixture lấy THẲNG từ gói bài đang seed (bẫy đầu tiên trong AGENTS.md: fixture không
 * giống dữ liệu thật thì test vô dụng). P01#0 là câu "os.getppid() trả về gì?".
 */
const LESSON_DIR = join(__dirname, '../../scripts/pe-v4/out-advanced/lessons');

function readLessonMcq(file: string): Mcq[] {
  const lesson = JSON.parse(readFileSync(join(LESSON_DIR, file), 'utf8')) as {
    content_json: { step_2: { mcq: Mcq[] } };
  };
  return lesson.content_json.step_2.mcq;
}

const realMcqs = readdirSync(LESSON_DIR)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => readLessonMcq(f).map((m, i) => ({ label: `${f}#${i}`, m })));

/** Bản sao sâu của câu thật để từng ca tự sửa mà không ảnh hưởng ca khác. */
const p01 = (): Mcq => structuredClone(readLessonMcq('001-P01.json')[0]);

/** Câu thật đã chỉnh cho đáp án đúng KHÔNG dài vượt trội, để ca kiểm luật khác khỏi dính A5. */
function balanced(): Mcq {
  const m = p01();
  m.options[0].text = 'PID của process hiện tại đang chạy dòng code';
  m.options[2].text = 'Số process con mà process này đang giữ';
  return m;
}

describe('mcq-filters — dữ liệu thật của giáo trình', () => {
  it('đọc được đủ câu step_2.mcq của 48 bài', () => {
    // 46 bài 3 câu + 2 bài 4 câu (AGENTS.md, mục ôn tập).
    expect(realMcqs).toHaveLength(146);
  });

  it('mọi câu thật đều qua A1–A4: luật không loại oan đúng định dạng repo đang dùng', () => {
    const failed = realMcqs.flatMap(({ label, m }) => {
      const a1 = ruleA1Schema(m);
      if (!a1.ok || !a1.mcq) return [`${label} A1 ${a1.reason}`];
      return [ruleA2SingleAnswer, ruleA3OptionText, ruleA4Explained]
        .map((rule) => rule(a1.mcq!))
        .filter((r) => !r.ok)
        .map((r) => `${label} ${r.reason}`);
    });
    expect(failed).toEqual([]);
  });

  it('các câu thật không trùng nhau theo A6 (ngưỡng 0,6 không quá chặt)', () => {
    const dedup = new DedupIndex();
    const dup: string[] = [];
    for (const { label, m } of realMcqs) {
      const r = dedup.check(m);
      if (!r.ok) dup.push(`${label}: ${r.reason}`);
      dedup.add(m, label);
    }
    expect(dup).toEqual([]);
  });
});

describe('A1 — schema', () => {
  it('nhận câu thật và trả câu đã ép kiểu', () => {
    const r = ruleA1Schema(p01());
    expect(r.ok).toBe(true);
    expect(r.mcq?.options).toHaveLength(3);
  });

  it.each([
    ['chuỗi thay vì object', 'không phải object JSON'],
    [{ options: [], correct: 0 }, 'thiếu question'],
    [{ question: 'q', options: 'a,b', correct: 0 }, 'thiếu options'],
    [
      { question: 'q', options: ['a', 'b', 'c'], correct: 0 },
      'không phải object',
    ],
    [{ question: 'q', options: [{}, {}, {}], correct: '1' }, 'thiếu correct'],
  ])('loại %j', (raw, reason) => {
    const r = ruleA1Schema(raw);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain(reason);
  });
});

describe('A2 — đúng một đáp án', () => {
  it('loại khi hai lựa chọn cùng correct: true', () => {
    const m = p01();
    m.options[0].correct = true;
    expect(ruleA2SingleAnswer(m)).toEqual({
      ok: false,
      reason: '2 lựa chọn mang correct: true, cần đúng 1',
    });
  });

  it('loại khi chỉ số correct không trỏ vào lựa chọn mang cờ', () => {
    const m = p01();
    m.correct = 0;
    expect(ruleA2SingleAnswer(m).ok).toBe(false);
  });

  it('loại khi chỉ có 2 lựa chọn', () => {
    const m = p01();
    m.options.splice(0, 1);
    m.correct = 0;
    expect(ruleA2SingleAnswer(m).reason).toContain('2 lựa chọn, cần 3–4');
  });
});

describe('A3 — lựa chọn dùng khoá text', () => {
  it('loại lựa chọn dùng khoá title như câu "dự đoán" (FE sẽ hiện nút trắng)', () => {
    const m = p01();
    const asPredict = m.options.map(({ text, ...rest }) => ({
      ...rest,
      title: text,
    }));
    const r = runMcqFilters(
      { ...m, options: asPredict },
      {
        moduleCode: 'M1',
        concepts: ['PID'],
        dedup: new DedupIndex(),
      },
    );
    expect(r.ok).toBe(false);
    expect(r.failures.map((f) => f.code)).toContain('A3');
    expect(r.failures.find((f) => f.code === 'A3')?.reason).toContain(
      'khoá title',
    );
  });

  it('loại hai lựa chọn trùng chữ', () => {
    const m = p01();
    m.options[2].text = `  ${m.options[0].text.toUpperCase()} `;
    expect(ruleA3OptionText(m).reason).toBe('hai lựa chọn trùng chữ');
  });
});

describe('A4 — có giải thích', () => {
  it('loại khi thiếu explanation', () => {
    const m = p01();
    m.explanation = '  ';
    expect(ruleA4Explained(m).ok).toBe(false);
  });

  it('loại khi một lựa chọn thiếu detail', () => {
    const m = p01();
    m.options[2].detail = '';
    expect(ruleA4Explained(m).reason).toBe('lựa chọn 2 thiếu detail');
  });
});

describe('A5 — không lộ đáp án', () => {
  it('loại khi chữ của đáp án đúng nằm nguyên văn trong câu hỏi', () => {
    const m = balanced();
    m.question = `Vì sao nói os.getppid() là ${m.options[1].text.toLowerCase()}?`;
    expect(ruleA5NoLeak(m).reason).toContain('nằm nguyên văn');
  });

  it('không loại đáp án ngắn trùng chữ tình cờ ("4" trong "(3, 4)")', () => {
    const m = balanced();
    m.question = 'a có shape (3, 4). a.sum(axis=0) có mấy phần tử?';
    m.options = [
      { text: '3', detail: 'axis=1', correct: false },
      { text: '4', detail: 'đúng', correct: true },
      { text: '12', detail: 'size', correct: false },
    ];
    expect(ruleA5NoLeak(m).ok).toBe(true);
  });

  it('loại đáp án đúng dài hơn 1,5 lần lựa chọn dài nhất còn lại (câu P01#0 thật)', () => {
    // Câu thật: đáp án đúng 46 ký tự, lựa chọn sai dài nhất 30 — người đoán mò chọn câu dài.
    expect(ruleA5NoLeak(p01()).reason).toContain('46 ký tự > 1.5 × 30');
  });

  it('nhận khi các lựa chọn dài tương đương', () => {
    expect(ruleA5NoLeak(balanced()).ok).toBe(true);
  });
});

describe('A6 — không trùng', () => {
  it('loại câu trùng nguyên văn một câu step_2.mcq có sẵn', () => {
    const dedup = new DedupIndex();
    dedup.add(p01(), 'P01#0');
    expect(dedup.check(p01()).reason).toBe('trùng content_hash với câu đã có');
  });

  it('đảo thứ tự lựa chọn và đổi hoa thường vẫn cùng content_hash', () => {
    const a = p01();
    const b = p01();
    b.options.reverse();
    b.question = `  ${b.question.toUpperCase()}  `;
    expect(contentHash(b)).toBe(contentHash(a));
  });

  it('loại câu viết lại nhẹ (Jaccard ≥ 0,6) dù hash khác', () => {
    const dedup = new DedupIndex();
    dedup.add(p01(), 'P01#0');
    const m = p01();
    m.question = 'Hàm os.getppid() trả về giá trị gì?';
    const r = dedup.check(m);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('giống P01#0');
  });

  it('nhận câu khác hẳn trong cùng bài', () => {
    const dedup = new DedupIndex();
    dedup.add(p01(), 'P01#0');
    expect(dedup.check(readLessonMcq('001-P01.json')[1]).ok).toBe(true);
  });

  it('loại hash đã có trong DB dù không có nội dung để tính Jaccard', () => {
    const dedup = new DedupIndex();
    dedup.addHash(contentHash(p01()));
    expect(dedup.check(p01()).ok).toBe(false);
  });
});

describe('A7 — gắn module và khái niệm', () => {
  it.each([
    ['M1', ['PID'], true],
    ['', ['PID'], false],
    ['M1 · Tiến trình', ['PID'], false],
    ['M1', [], false],
    ['M1', ['  '], false],
  ])('module %j, khái niệm %j → %s', (code, concepts, expected) => {
    expect(ruleA7Tagged(code, concepts).ok).toBe(expected);
  });
});

describe('runMcqFilters', () => {
  const ctx = () => ({
    moduleCode: 'M1',
    concepts: ['PID'],
    dedup: new DedupIndex(),
  });

  it('câu sạch qua mọi luật', () => {
    expect(runMcqFilters(balanced(), ctx())).toMatchObject({
      ok: true,
      failures: [],
    });
  });

  it('báo MỌI luật trượt, không dừng ở luật đầu (báo cáo đếm theo mã)', () => {
    const m = balanced();
    m.options[0].correct = true; // A2
    m.explanation = ''; // A4
    const r = runMcqFilters(m, { ...ctx(), concepts: [] }); // A7
    expect(r.failures.map((f) => f.code)).toEqual(['A2', 'A4', 'A7']);
  });

  it('A1 trượt thì dừng, chỉ báo A1', () => {
    expect(runMcqFilters(null, ctx()).failures.map((f) => f.code)).toEqual([
      'A1',
    ]);
  });
});

describe('cleanMcq', () => {
  it('chỉ giữ khoá của step_2.mcq, bỏ khoá lạ mô hình thêm vào', () => {
    const raw = { ...balanced(), hint: 'x', id: 7 };
    raw.options[0] = { ...raw.options[0], id: 'a' } as Mcq['options'][number];
    const out = cleanMcq(raw);
    expect(Object.keys(out).sort()).toEqual([
      'correct',
      'explanation',
      'options',
      'question',
    ]);
    expect(Object.keys(out.options[0]).sort()).toEqual([
      'correct',
      'detail',
      'text',
    ]);
  });
});
