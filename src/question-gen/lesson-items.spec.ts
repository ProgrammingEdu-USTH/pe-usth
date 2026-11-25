import { readFileSync } from 'fs';
import { join } from 'path';
import {
  codeContentHash,
  lessonItems,
  toPyLiteral,
  type CodePayload,
} from './lesson-items';
import type { Mcq } from './mcq-filters';

/** Giáo trình đang chạy trên DB (pe-da) — đúng gói mà script nhập ngân hàng đề đọc. */
const LESSONS = (
  JSON.parse(
    readFileSync(
      join(__dirname, '../../scripts/pe-da/out/lessons.json'),
      'utf8',
    ),
  ) as { lessons: Array<Record<string, unknown>> }
).lessons;
const byCode = (code: string) => {
  const l = LESSONS.find((x) => x.lesson_code === code);
  if (!l) throw new Error(`thiếu bài ${code} trong gói pe-da`);
  return l;
};
const ALL = LESSONS.map((l) => lessonItems(l));
const ITEMS = ALL.flatMap((r) => r.items);
const SKIPPED = ALL.flatMap((r) => r.skipped);

describe('toPyLiteral', () => {
  it.each([
    [null, 'None'],
    [true, 'True'],
    [false, 'False'],
    [6, '6'],
    [2.5, '2.5'],
    [-0.1, '-0.1'],
    ['Late', '"Late"'],
    ['a"b\\c\nd', '"a\\"b\\\\c\\nd"'],
    ['Cà phê', '"Cà phê"'],
    [[], '[]'],
    [[1, [2, null]], '[1, [2, None]]'],
    [{ values: [7, 12], pick: 'AM' }, '{"values": [7, 12], "pick": "AM"}'],
  ])('%j → %s', (v, py) => {
    expect(toPyLiteral(v)).toBe(py);
  });

  it('số không hữu hạn thì ném, không sinh chuỗi Python sai', () => {
    expect(() => toPyLiteral(Number.NaN)).toThrow('không hữu hạn');
    expect(() => toPyLiteral(undefined)).toThrow();
  });
});

describe('lessonItems — dữ liệu thật (pe-da)', () => {
  it('mọi câu trắc nghiệm có đúng MỘT lựa chọn đúng, chỉ số correct trỏ đúng nó, và lựa chọn dùng khoá text', () => {
    const mcq = ITEMS.filter((i) => i.type === 'mcq').map(
      (i) => i.payload as Mcq,
    );
    expect(mcq.length).toBeGreaterThan(0);
    for (const m of mcq) {
      const flagged = m.options.flatMap((o, k) => (o.correct ? [k] : []));
      expect(flagged).toEqual([m.correct]);
      for (const o of m.options) {
        expect(o.text.trim()).not.toBe('');
        expect(Object.keys(o).sort()).toEqual(['correct', 'detail', 'text']);
      }
    }
  });

  it('ca chấm dạng dữ liệu đổi thành biểu thức gọi solve(...) (PY16)', () => {
    const code = lessonItems(byCode('PY16')).items.find(
      (i) => i.type === 'code',
    );
    const p = code?.payload as CodePayload;
    expect(p.tests[0]).toEqual({
      name: 'Ba số đo',
      call: 'solve([4, 6, 8])',
      expected: '6',
    });
    expect(p.tests[2]).toMatchObject({ call: 'solve([])', expected: 'None' });
    expect(p.solutionCode).toContain('def solve');
    expect(p.starterCode).not.toBe(p.solutionCode);
  });

  it('bài hợp đồng script (tiêm biến) KHÔNG đổi được — bị bỏ kèm lý do (PY01)', () => {
    const r = lessonItems(byCode('PY01'));
    expect(r.items.filter((i) => i.type === 'code')).toEqual([]);
    expect(r.skipped).toEqual([
      expect.objectContaining({
        type: 'code',
        reason: expect.stringContaining('script') as string,
      }),
    ]);
  });

  it('mọi bài code được đổi đều gọi solve(...) và có lời giải khác code khởi tạo', () => {
    const code = ITEMS.filter((i) => i.type === 'code').map(
      (i) => i.payload as CodePayload,
    );
    expect(code.length).toBeGreaterThan(0);
    for (const p of code) {
      expect(p.tests.length).toBeGreaterThan(0);
      expect(p.tests.every((t) => t.call.startsWith('solve('))).toBe(true);
      expect(p.starterCode.trim()).not.toBe(p.solutionCode.trim());
      expect(p.title.trim()).not.toBe('');
      expect(p.description.trim()).not.toBe('');
    }
  });

  it('bài cần file dữ liệu, ghim kiểu trả về hay gói trình duyệt không có đều bị bỏ, có lý do', () => {
    const reasons = SKIPPED.filter((s) => s.type === 'code').map(
      (s) => s.reason,
    );
    expect(reasons.some((r) => r.includes('file dữ liệu'))).toBe(true);
    expect(reasons.some((r) => r.includes('kiểu trả về'))).toBe(true);
    expect(reasons.some((r) => r.includes('sqlalchemy'))).toBe(true);
    // Mỗi bài bị bỏ đều nói vì sao — không có lý do rỗng.
    expect(SKIPPED.every((s) => s.reason.trim() !== '')).toBe(true);
  });

  it('không câu nào trùng băm (cột content_hash là UNIQUE)', () => {
    const hashes = ITEMS.map((i) => i.content_hash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });
});

describe('lessonItems — câu hỏng', () => {
  const base = byCode('PY16');
  const content = base.content_json as {
    step_2: { mcq: Array<Record<string, unknown>> };
    step_4: Record<string, unknown>;
  };

  it('câu có HAI lựa chọn mang correct: true bị bỏ ở luật A2', () => {
    const q = content.step_2.mcq[0] as { options: object[] };
    const broken = {
      ...base,
      content_json: {
        step_2: {
          mcq: [
            {
              ...q,
              options: q.options.map((o) => ({ ...o, correct: true })),
            },
          ],
        },
      },
    };
    const r = lessonItems(broken);
    expect(r.items).toEqual([]);
    expect(r.skipped[0]).toMatchObject({ type: 'mcq', index: 0 });
    expect(r.skipped[0].reason).toMatch(/^A2:/);
  });

  it('gói ngoài danh sách worker nạp được thì bỏ bài code', () => {
    const r = lessonItems({
      ...base,
      content_json: {
        step_4: { ...content.step_4, packages: ['scipy'] },
      },
    });
    expect(r.items).toEqual([]);
    expect(r.skipped[0].reason).toContain('scipy');
  });

  it('bài không có ca chấm (bài quy trình) không bị tính là "bị bỏ"', () => {
    const r = lessonItems({
      ...base,
      content_json: { step_4: { task: { body: 'Cài Python' } } },
    });
    expect(r).toEqual({ items: [], skipped: [] });
  });
});

describe('codeContentHash', () => {
  it('đổi một ca chấm thì đổi băm; cùng nội dung thì cùng băm', () => {
    const p = {
      description: 'Đề',
      starterCode: 'def solve(data):\n    pass\n',
      tests: [{ name: 'a', call: 'solve(1)', expected: '2' }],
    };
    expect(codeContentHash(p)).toBe(codeContentHash({ ...p }));
    expect(codeContentHash(p)).not.toBe(
      codeContentHash({
        ...p,
        tests: [{ name: 'a', call: 'solve(1)', expected: '3' }],
      }),
    );
  });
});
