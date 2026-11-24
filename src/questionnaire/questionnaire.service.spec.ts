import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';

/** Hình dạng bộ câu trong `questionnaires.questions_json` (spec §2), có đáp án. */
const DOC = {
  course_id: 'python_advanced',
  version: 3,
  params: {
    mastery_threshold: 0.66,
    self_assess_weight: 0.2,
    skip_policy: 'wrong',
  },
  modules: [
    { code: 'M1', first_lesson_no: 1 },
    { code: 'M2', first_lesson_no: 19 },
  ],
  items: [
    {
      id: 'q-m1-1',
      module_code: 'M1',
      question: 'print(8 + 11) in gì?',
      options: [{ text: '19' }, { text: '811' }, { text: '8 + 11' }],
      correct: 0,
      explanation: 'Python cộng hai số.',
      source: { lesson_code: 'PY01', sort_order: 1, index: 0 },
    },
    {
      id: 'q-m2-1',
      module_code: 'M2',
      question: 'np.array([4, 2, 9]) giữ thứ tự nào?',
      options: [{ text: '[4 2 9]' }, { text: '[9 2 4]' }, { text: '[2 4 9]' }],
      correct: 0,
      explanation: 'Mảng giữ thứ tự phần tử.',
    },
  ],
};

type AsyncMock = jest.Mock<Promise<unknown>, [unknown]>;
const asyncMock = (): AsyncMock => jest.fn<Promise<unknown>, [unknown]>();

type PrismaMock = {
  questionnaire: { findMany: AsyncMock };
  lesson: { findMany: AsyncMock };
  placementAttempt: { findUnique: AsyncMock; upsert: AsyncMock };
  survey: { findFirst: AsyncMock; update: AsyncMock; create: AsyncMock };
  $transaction: jest.Mock<
    Promise<unknown>,
    [(tx: PrismaMock) => Promise<unknown>, unknown]
  >;
};

function make(rows: unknown[] = [{ id: 7, version: 3, questionsJson: DOC }]) {
  const prisma: PrismaMock = {
    questionnaire: { findMany: asyncMock() },
    lesson: { findMany: asyncMock() },
    placementAttempt: { findUnique: asyncMock(), upsert: asyncMock() },
    survey: {
      findFirst: asyncMock(),
      update: asyncMock(),
      create: asyncMock(),
    },
    // Đối số thứ hai là TX_OPTIONS; mock chạy thẳng hàm với chính prisma làm tx.
    $transaction: jest.fn<
      Promise<unknown>,
      [(tx: PrismaMock) => Promise<unknown>, unknown]
    >((fn) => fn(prisma)),
  };
  prisma.questionnaire.findMany.mockResolvedValue(rows);
  // Bảng lessons của DB: module M2 bắt đầu ở bài 19 (giáo trình pe-da).
  prisma.lesson.findMany.mockResolvedValue([
    { module: 'M1 · Python nền tảng', sortOrder: 1 },
    { module: 'M2 · NumPy', sortOrder: 19 },
    { module: 'M3 · pandas', sortOrder: 42 },
  ]);
  prisma.placementAttempt.findUnique.mockResolvedValue(null);
  prisma.survey.findFirst.mockResolvedValue(null);
  return { prisma, svc: new QuestionnaireService(prisma as never) };
}

describe('QuestionnaireService.getQuestionnaire', () => {
  it('không lộ đáp án, lời giải hay nguồn câu; cache bản đang bật', async () => {
    const { prisma, svc } = make();
    const res = await svc.getQuestionnaire('python_advanced');
    await svc.getQuestionnaire('python_advanced');
    const json = JSON.stringify(res);
    expect(json).not.toContain('"correct"');
    expect(json).not.toContain('Python cộng hai số');
    expect(json).not.toContain('PY01');
    expect(res.questionnaire_id).toBe(7);
    expect(res.version).toBe(3);
    expect(res.items.map((it) => it.id)).toEqual(['q-m1-1', 'q-m2-1']);
    expect(prisma.questionnaire.findMany).toHaveBeenCalledTimes(1);
  });

  it('bỏ qua bản mảng cũ của /placement và bản của khoá khác', async () => {
    const { svc } = make([
      { id: 9, version: 5, questionsJson: [{ id: 1 }] },
      { id: 8, version: 4, questionsJson: { ...DOC, course_id: 'sql_co_ban' } },
      { id: 7, version: 3, questionsJson: DOC },
    ]);
    expect(
      (await svc.getQuestionnaire('python_advanced')).questionnaire_id,
    ).toBe(7);
    expect((await svc.getQuestionnaire('sql_co_ban')).questionnaire_id).toBe(8);
  });

  it('chưa có bộ câu cho khoá thì 404', async () => {
    const { svc } = make([]);
    await expect(svc.getQuestionnaire('python_advanced')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('QuestionnaireService.submit', () => {
  it('server tự chấm và xếp module theo bài đầu đọc từ bảng lessons', async () => {
    const { svc } = make();
    const r = await svc.submit(1, 'python_advanced', {
      questionnaire_id: 7,
      answers: { 'q-m1-1': 0, 'q-m2-1': 2 },
    });
    expect(r).toMatchObject({
      ok: true,
      done: true,
      updated: false,
      start_module: 'M2',
      start_lesson_no: 19,
      module_scores: { M1: 1, M2: 0 },
      score: 1,
      total: 2,
      skipped_all: false,
    });
    // Đã nộp nên được xem lời giải.
    expect(r.explanations['q-m1-1']).toBe('Python cộng hai số.');
  });

  it('bộ câu đã đổi thì 409; id câu lạ hoặc chỉ số ngoài khoảng thì 400; không ghi gì', async () => {
    const { prisma, svc } = make();
    await expect(
      svc.submit(1, 'python_advanced', { questionnaire_id: 99, answers: {} }),
    ).rejects.toThrow(ConflictException);
    await expect(
      svc.submit(1, 'python_advanced', { answers: { 'q-x': 0 } }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      svc.submit(1, 'python_advanced', { answers: { 'q-m1-1': 7 } }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('nộp lại thì CẬP NHẬT (upsert theo người + bản câu hỏi), không nhân đôi', async () => {
    const { prisma, svc } = make();
    prisma.placementAttempt.findUnique.mockResolvedValue({ id: 5n });
    const r = await svc.submit(1, 'python_advanced', {
      answers: { 'q-m1-1': 1 },
    });
    expect(r.updated).toBe(true);
    expect(prisma.placementAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_questionnaireId: { userId: 1, questionnaireId: 7 } },
        // answers theo thứ tự câu, -1 = bỏ qua; khớp CHECK cardinality(answers) = total.
        update: { answers: [1, -1], score: 0, total: 2 },
      }),
    );
  });

  it('gộp vào survey MỚI NHẤT, giữ career_target để lộ trình không đổi', async () => {
    const { prisma, svc } = make();
    prisma.survey.findFirst.mockResolvedValue({
      id: 42,
      dataJson: {
        career_target: 'data analyst',
        placement: { sql_co_ban: { version: 1 } },
      },
    });
    await svc.submit(1, 'python_advanced', { answers: { 'q-m1-1': 0 } });
    expect(prisma.survey.create).not.toHaveBeenCalled();
    expect(prisma.survey.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        dataJson: expect.objectContaining({
          career_target: 'data analyst',
          placement: expect.objectContaining({
            sql_co_ban: { version: 1 },
            python_advanced: expect.objectContaining({
              questionnaire_id: 7,
              answers: { 'q-m1-1': 0 },
            }) as unknown,
          }) as unknown,
        }) as unknown,
      },
    });
  });

  it('chưa có survey nào thì tạo một bản chỉ chứa kết quả xếp module', async () => {
    const { prisma, svc } = make();
    await svc.submit(3, 'python_advanced', { answers: {} });
    expect(prisma.survey.create).toHaveBeenCalledWith({
      data: {
        userId: 3,
        dataJson: {
          placement: {
            python_advanced: expect.objectContaining({
              version: 3,
            }) as unknown,
          },
        },
      },
    });
  });
});

describe('QuestionnaireService.getMine', () => {
  it('đọc kết quả của khoá trong survey mới nhất; chưa làm thì done = false', async () => {
    const { prisma, svc } = make();
    expect(await svc.getMine(1, 'python_advanced')).toMatchObject({
      done: false,
    });
    prisma.survey.findFirst.mockResolvedValue({
      dataJson: {
        placement: {
          python_advanced: {
            questionnaire_id: 7,
            version: 3,
            result: { start_module: 'M2', start_lesson_no: 19 },
          },
        },
      },
    });
    expect(await svc.getMine(1, 'python_advanced')).toMatchObject({
      done: true,
      start_module: 'M2',
      start_lesson_no: 19,
      questionnaire_id: 7,
    });
  });
});
