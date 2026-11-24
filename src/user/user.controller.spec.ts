import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QuestionnaireService } from 'src/questionnaire/questionnaire.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

type AsyncMock = jest.Mock<Promise<unknown>, unknown[]>;

describe('UserController', () => {
  let controller: UserController;
  let calls: string[];
  let userService: { submitSurvey: AsyncMock };
  let questionnaire: { prepare: AsyncMock; persist: AsyncMock };

  beforeEach(async () => {
    calls = [];
    const track = (name: string, value: unknown) =>
      jest.fn<Promise<unknown>, unknown[]>(() => {
        calls.push(name);
        return Promise.resolve(value);
      });
    userService = {
      submitSurvey: track('submitSurvey', { ok: true, template: null }),
    };
    questionnaire = {
      prepare: track('prepare', { prepared: true }),
      persist: track('persist', { start_module: 'M2' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: QuestionnaireService, useValue: questionnaire },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('survey không kèm bộ câu hỏi: giữ nguyên hành vi cũ', async () => {
    expect(await controller.submitSurvey(1, { job: 'sv' })).toEqual({
      ok: true,
      template: null,
    });
    expect(calls).toEqual(['submitSurvey']);
  });

  it('survey kèm bộ câu hỏi: chấm TRƯỚC, ghi khảo sát, rồi lưu kết quả xếp module', async () => {
    const res = await controller.submitSurvey(1, {
      job: 'sv',
      questionnaire: { answers: { 'q-m1-1': 0 } },
    });
    expect(calls).toEqual(['prepare', 'submitSurvey', 'persist']);
    expect(questionnaire.prepare).toHaveBeenCalledWith('python_advanced', {
      answers: { 'q-m1-1': 0 },
    });
    // UserService chỉ nhận 11 trường khảo sát, không nhận câu trả lời thô.
    expect(userService.submitSurvey).toHaveBeenCalledWith(1, { job: 'sv' });
    expect(res).toEqual({
      ok: true,
      template: null,
      placement: { start_module: 'M2' },
    });
  });

  it('câu trả lời sai hình thì 400 khi CHƯA ghi khảo sát nào', async () => {
    questionnaire.prepare.mockRejectedValue(new BadRequestException('id lạ'));
    await expect(
      controller.submitSurvey(1, {
        job: 'sv',
        questionnaire: { answers: { x: 0 } },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(userService.submitSurvey).not.toHaveBeenCalled();
  });
});
