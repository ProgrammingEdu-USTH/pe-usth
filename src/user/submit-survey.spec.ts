import { ValidationPipe } from '@nestjs/common';
import { validationExceptionFactory } from 'src/common/filters/validation-exception.factory';
import { SurveyDto } from './dto/user.dto';
import { UserService } from './user.service';

type AsyncMock = jest.Mock<Promise<unknown>, [unknown]>;
const asyncMock = (): AsyncMock => jest.fn<Promise<unknown>, [unknown]>();

type TxMock = {
  survey: { findFirst: AsyncMock; create: AsyncMock };
  user: { update: AsyncMock };
  roadMap: { upsert: AsyncMock };
};

function make() {
  const tx: TxMock = {
    survey: { findFirst: asyncMock(), create: asyncMock() },
    user: { update: asyncMock() },
    roadMap: { upsert: asyncMock() },
  };
  tx.survey.findFirst.mockResolvedValue(null);
  tx.survey.create.mockResolvedValue({ id: 50 });
  const prisma = {
    $transaction: (fn: (t: TxMock) => Promise<unknown>) => fn(tx),
  };
  const svc = new UserService(
    prisma as never,
    { invalidate: jest.fn() } as never,
  );
  return { tx, svc };
}

describe('UserService.submitSurvey — kết quả xếp module', () => {
  it('khảo sát mới MANG THEO kết quả xếp module của bản trước', async () => {
    // Làm bài đầu vào trước, khảo sát sau: thiếu bước này thì kết quả nằm ở bản cũ và
    // GET /me/questionnaire (đọc bản mới nhất) báo "chưa làm".
    const { tx, svc } = make();
    tx.survey.findFirst.mockResolvedValue({
      dataJson: { placement: { python_advanced: { version: 3 } } },
    });
    await svc.submitSurvey(1, { career_target: 'Data' });
    expect(tx.survey.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        dataJson: {
          career_target: 'Data',
          placement: { python_advanced: { version: 3 } },
        },
      },
    });
  });

  it('không lưu câu trả lời thô của bộ câu hỏi vào khảo sát', async () => {
    const { tx, svc } = make();
    await svc.submitSurvey(1, {
      job: 'sv',
      questionnaire: { answers: { 'q-m1-1': 0 } },
    });
    expect(tx.survey.create).toHaveBeenCalledWith({
      data: { userId: 1, dataJson: { job: 'sv' } },
    });
  });
});

describe('SurveyDto qua ValidationPipe thật (forbidNonWhitelisted)', () => {
  // Đúng cấu hình của gateway (src/api-gateway/api-gateway.module.ts).
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: validationExceptionFactory,
  });
  const run = (body: unknown) =>
    pipe.transform(body, { type: 'body', metatype: SurveyDto });

  it('nhận body FE gửi kèm bộ câu hỏi, giữ nguyên map câu trả lời', async () => {
    const dto = (await run({
      job: 'Sinh viên',
      questionnaire: {
        course_id: 'python_advanced',
        questionnaire_id: 7,
        answers: { 'q-m1-1': 0, 'q-m1-2': null },
        self: { 'sa-m1': 2 },
      },
    })) as SurveyDto;
    expect(dto.questionnaire?.answers).toEqual({ 'q-m1-1': 0, 'q-m1-2': null });
    expect(dto.questionnaire?.self).toEqual({ 'sa-m1': 2 });
  });

  it('trường lạ trong questionnaire vẫn bị chặn (400)', async () => {
    await expect(
      run({ questionnaire: { answers: {}, score: 24 } }),
    ).rejects.toBeDefined();
  });

  it('answers không phải object thì 400', async () => {
    await expect(
      run({ questionnaire: { answers: [0, 1] } }),
    ).rejects.toBeDefined();
  });
});
