/**
 * Unit test cho Bộ câu hỏi đầu vào (/onboarding), Học lại khoá & Đổi tên hiển thị (/profile).
 *
 * Bao phủ:
 *  1. Hợp đồng mock JSON (`questionnaire.json` & `reset-response.json`) qua chung validator với API thật.
 *  2. 7 ví dụ tính tay xếp module trong docs/questionnaire-spec.md §6.
 *  3. Khớp danh sách trường `SurveyDto` trong src/user/dto/user.dto.ts và nối mảng bằng ', '.
 *  4. Phân quyền người xem (khách @guest.local / chưa đăng nhập -> vào học thẳng) & apiFetchSessionOnly (0 gọi /auth/guest).
 *  5. Luồng mock + API thật cho POST /api/survey, GET/POST /api/questionnaire, POST /api/courses/:id/reset, PUT /api/user và xử lý lỗi 400/403/429 thân thiện.
 *  6. Nối dây UI: không đọc `correctIndex`, trang công khai chỉ dùng `apiFetchSessionOnly`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { apiFetchSessionOnly } from '../../src/lib/api.ts';
import {
  submitCourseReset,
  submitDisplayName,
  USE_COURSE_RESET_MOCK,
  validateDisplayName,
  validateResetResponse,
} from '../../src/lib/course-reset-profile.ts';
import {
  buildQuestionnaireAnswersPayload,
  buildSurveyDtoPayload,
  classifyOnboardingViewer,
  friendlyApiError,
  getMockQuestionnaire,
  isVersionConflictError,
  loadMyPlacement,
  loadQuestionnaire,
  resolveModuleStartLesson,
  resolvePlacementModuleTitle,
  scoreQuestionnaireMock,
  submitQuestionnaireAndSurvey,
  SURVEY_DTO_FIELDS,
  USE_QUESTIONNAIRE_MOCK,
  validatePlacementResult,
  validateQuestionnaire,
} from '../../src/lib/onboarding-questionnaire.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const ROOT = join(FE, '..');

const CURRICULA = JSON.parse(readFileSync(join(FE, 'src/lib/curricula.json'), 'utf8'));
const PY_MODULES = CURRICULA.CURRICULA.python_advanced.modules;
const MOCK_Q = JSON.parse(readFileSync(join(FE, 'src/lib/mock/questionnaire.json'), 'utf8'));
const MOCK_RESET = JSON.parse(readFileSync(join(FE, 'src/lib/mock/reset-response.json'), 'utf8'));

test('cờ mặc định nối API thật (env bật mock khi test) và file mock đạt validator chuẩn', () => {
  assert.equal(USE_QUESTIONNAIRE_MOCK, false);
  assert.equal(USE_COURSE_RESET_MOCK, false);

  assert.deepEqual(validateQuestionnaire(MOCK_Q), []);
  assert.deepEqual(getMockQuestionnaire().course_id, 'python_advanced');

  // items gửi cho client tuyệt đối không chứa correct / explanation (stripAnswers).
  for (const item of MOCK_Q.items) {
    assert.equal('correct' in item, false, `${item.id} không được lộ correct trong items`);
    assert.equal('explanation' in item, false, `${item.id} không được lộ explanation trong items`);
    for (const opt of item.options) {
      assert.equal(typeof opt.text, 'string');
      assert.ok(opt.text.trim().length > 0);
    }
    const loc = resolveModuleStartLesson(PY_MODULES, item.module_code);
    assert.ok(loc.lessonNo >= 1 && loc.moduleTitle.startsWith(item.module_code));
  }

  assert.deepEqual(validateResetResponse(MOCK_RESET), []);
});

test('khớp 7 ví dụ tính tay xếp module trong docs/questionnaire-spec.md §6', () => {
  // Dựng bộ 8 module (M1..M8) với bài đầu khớp bảng §3: M1(1), M2(8), M3(14), M4(21), M5(26), M6(32), M7(41), M8(47).
  const count = [7, 6, 7, 5, 6, 9, 6, 2];
  const specModules = count.map((n, i) => ({
    title: `M${i + 1} · Chặng ${i + 1}`,
    lessons: Array.from({ length: n }, (_, j) => `B${i + 1}_${j + 1}`),
  }));
  const testedMods = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];
  const items = testedMods.flatMap((m) => [
    { id: `${m}-1`, module_code: m, question: `Q1 ${m}`, options: [{ text: 'A' }, { text: 'B' }] },
    { id: `${m}-2`, module_code: m, question: `Q2 ${m}`, options: [{ text: 'A' }, { text: 'B' }] },
  ]);
  const key = Object.fromEntries(items.map((it) => [it.id, { correct: 0, explanation: 'Đúng' }]));
  const specQ = {
    course_id: 'python_advanced',
    version: 1,
    params: { mastery_threshold: 0.67, self_assess_weight: 0.2, skip_policy: 'wrong' },
    self_assess: [
      {
        id: 'sa-m1',
        module_code: 'M1',
        question: 'Tự đánh giá M1',
        options: [
          { text: 'Chưa nghe tới', value: 0 },
          { text: 'Dùng thường xuyên', value: 1 },
        ],
      },
    ],
    items,
  };

  const makeAllRight = () => Object.fromEntries(items.map((it) => [it.id, 0]));

  // #1: M1 2/2, M2 1/2, còn lại 2/2, không tự khai -> M2 (bài 8), đạt 6 -> Sẵn sàng bứt phá
  {
    const ans = makeAllRight();
    ans['M2-2'] = 1;
    const r = scoreQuestionnaireMock(specQ, ans, {}, specModules, key, testedMods);
    assert.equal(r.start_module, 'M2');
    assert.equal(r.start_lesson_no, 8);
    assert.equal(r.level_title, 'Sẵn sàng bứt phá');
  }

  // #2: M1 1/2 + tự khai 1 -> 0.8*0.5 + 0.2*1 = 0.6 < 0.67 -> bắt đầu M1
  {
    const ans = makeAllRight();
    ans['M1-2'] = 1;
    const r = scoreQuestionnaireMock(specQ, ans, { 'sa-m1': 1 }, specModules, key, testedMods);
    assert.equal(r.module_scores.M1, 0.6);
    assert.equal(r.start_module, 'M1');
  }

  // #3: M1 2/2 + tự khai 0 -> 0.8*1 + 0.2*0 = 0.8 >= 0.67 -> M1 đạt
  {
    const ans = makeAllRight();
    const r = scoreQuestionnaireMock(specQ, ans, { 'sa-m1': 0 }, specModules, key, testedMods);
    assert.equal(r.module_scores.M1, 0.8);
    assert.equal(r.start_module, 'M8');
  }

  // #4: M1-M2 2/2, M3 0/2, M4-M7 2/2 -> M3 (bài 14), review_modules=[]
  {
    const ans = makeAllRight();
    ans['M3-1'] = 1;
    ans['M3-2'] = 1;
    const r = scoreQuestionnaireMock(specQ, ans, {}, specModules, key, testedMods);
    assert.equal(r.start_module, 'M3');
    assert.equal(r.start_lesson_no, 14);
    assert.deepEqual(r.review_modules, []);
    assert.equal(r.level_title, 'Sẵn sàng bứt phá');
  }

  // #5: M1-M4 2/2, M5 1/2, M6 2/2, M7 0/2 -> M5 (bài 26), review_modules=['M7'], Nền tảng vững vàng
  {
    const ans = makeAllRight();
    ans['M5-2'] = 1;
    ans['M7-1'] = 1;
    ans['M7-2'] = 1;
    const r = scoreQuestionnaireMock(specQ, ans, {}, specModules, key, testedMods);
    assert.equal(r.start_module, 'M5');
    assert.equal(r.start_lesson_no, 26);
    assert.deepEqual(r.review_modules, ['M7']);
    assert.equal(r.level_title, 'Nền tảng vững vàng');
  }

  // #6: M1-M7 2/2 -> M8 (bài 47)
  {
    const r = scoreQuestionnaireMock(specQ, makeAllRight(), {}, specModules, key, testedMods);
    assert.equal(r.start_module, 'M8');
    assert.equal(r.start_lesson_no, 47);
    assert.equal(r.level_title, 'Sẵn sàng bứt phá');
  }

  // #7: Bỏ qua tất cả -> M1 (bài 1), skipped_all=true, Khởi đầu vững chắc
  {
    const ans = Object.fromEntries(items.map((it) => [it.id, null]));
    const r = scoreQuestionnaireMock(specQ, ans, {}, specModules, key, testedMods);
    assert.equal(r.start_module, 'M1');
    assert.equal(r.start_lesson_no, 1);
    assert.equal(r.skipped_all, true);
    assert.equal(r.level_title, 'Khởi đầu vững chắc');
    assert.deepEqual(validatePlacementResult(r), []);
  }
});

test('buildSurveyDtoPayload khớp đúng SurveyDto (src/user/dto/user.dto.ts) và nối mảng bằng ", "', () => {
  const dtoSrc = readFileSync(join(ROOT, 'src/user/dto/user.dto.ts'), 'utf8');
  const dtoStart = dtoSrc.indexOf('export class SurveyDto');
  const dtoBlock = dtoSrc.slice(dtoStart);
  const dtoFields = [...dtoBlock.matchAll(/^\s{2}([a-z_]+)\?:\s*string;/gm)].map((m) => m[1]);
  assert.deepEqual([...SURVEY_DTO_FIELDS], dtoFields);

  const payload = buildSurveyDtoPayload({
    job: '  Sinh viên  ',
    purpose: ['Phân tích dữ liệu', 'Học trên trường'],
    experience: '   ',
    language: ['Python', '', 'SQL'],
    level: 'Cơ bản',
    unknownFieldMustDrop: 'causes 400 if kept',
  });
  assert.deepEqual(payload, {
    job: 'Sinh viên',
    purpose: 'Phân tích dữ liệu, Học trên trường',
    language: 'Python, SQL',
    level: 'Cơ bản',
  });
  assert.equal('unknownFieldMustDrop' in payload, false);
  assert.equal('experience' in payload, false);
});

test('chỉ tài khoản đã đăng nhập được làm khảo sát; khách và người chưa đăng nhập vào học thẳng', () => {
  assert.equal(classifyOnboardingViewer(null), 'anonymous');
  assert.equal(classifyOnboardingViewer({}), 'anonymous');
  assert.equal(
    classifyOnboardingViewer({ id: 9, email: 'guest_8d9e@guest.local', guest: true }),
    'guest',
  );
  assert.equal(
    classifyOnboardingViewer({ id: 10, email: 'guest_abcd@guest.local' }),
    'guest',
  );
  assert.equal(
    classifyOnboardingViewer({ id: 3, email: 'sinhvien@usth.edu.vn', name: 'Minh' }),
    'authenticated',
  );
});

test('apiFetchSessionOnly gặp 401 khi không có phiên hợp lệ không bao giờ gọi /auth/guest', async () => {
  const saved = {
    fetch: globalThis.fetch,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    document: globalThis.document,
  };
  try {
    let guestCalls = 0;
    let apiCalls = 0;
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
    globalThis.document = { cookie: '' };
    globalThis.window = {};
    globalThis.fetch = async (url) => {
      const s = String(url);
      if (s.includes('/auth/guest')) guestCalls += 1;
      else apiCalls += 1;
      return { status: 401, ok: false, json: async () => ({}) };
    };

    const res = await apiFetchSessionOnly('/api/user');
    assert.equal(res.status, 401);
    assert.equal(apiCalls, 1);
    assert.equal(guestCalls, 0, 'trang công khai không được phép tạo tài khoản khách');
  } finally {
    globalThis.fetch = saved.fetch;
    globalThis.window = saved.window;
    globalThis.localStorage = saved.localStorage;
    globalThis.document = saved.document;
  }
});

test('loadQuestionnaire & submitQuestionnaireAndSurvey: nối POST /api/survey + GET /api/questionnaire, dọn /api/placement và xử lý lỗi 400/404/409', async () => {
  // 1. Mock mode vẫn chạy & sinh review/score đầy đủ từ mock_answer_key
  const calls = [];
  const resMock = await submitQuestionnaireAndSurvey({
    courseId: 'python_advanced',
    questionnaire: MOCK_Q,
    answers: { 'q-m1-1': 0, 'q-m1-2': 0, 'q-m2-1': 1 },
    selfAnswers: { 'sa-m1': 3 },
    surveyInput: { job: 'Sinh viên', purpose: ['Học trên trường', 'Phân tích dữ liệu'], level: 'Cơ bản' },
    modules: PY_MODULES,
    saveSurvey: true,
    useMock: true,
    fetcher: async (path, opts) => {
      calls.push({ path, opts });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, template: 'data', roadmap_id: 'u7_generated' }),
      };
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/api/survey');
  assert.deepEqual(JSON.parse(calls[0].opts.body), {
    job: 'Sinh viên',
    purpose: 'Học trên trường, Phân tích dữ liệu',
    level: 'Cơ bản',
  });
  assert.equal(resMock.surveySaved, true);
  assert.equal(resMock.roadmapId, 'u7_generated');
  assert.equal(resMock.placementSource, 'mock');
  assert.equal(resMock.placement.start_module, 'M2');
  assert.equal(resMock.placement.review?.length, MOCK_Q.items.length);
  assert.equal(resMock.placement.score, 2);
  assert.equal(resMock.placement.total, MOCK_Q.items.length);

  // Ca lỗi 400 ở mock mode -> trả thông báo thân thiện
  const res400 = await submitQuestionnaireAndSurvey({
    courseId: 'python_advanced',
    questionnaire: MOCK_Q,
    answers: {},
    selfAnswers: {},
    surveyInput: { level: 'Cơ bản' },
    modules: PY_MODULES,
    saveSurvey: true,
    useMock: true,
    fetcher: async () => ({
      ok: false,
      status: 400,
      json: async () => ({ message: ['Câu trả lời cho "mục đích học" không hợp lệ'] }),
    }),
  });
  assert.equal(res400.surveySaved, false);
  assert.match(res400.surveyError, /Dữ liệu chưa hợp lệ/);

  // 2. Bộ câu 24 câu của Nghĩa (sau khi strip đáp án đúng giống publicQuestionnaire của BE) đạt validateQuestionnaire
  const rawSeedQ = JSON.parse(
    readFileSync(join(ROOT, 'scripts/placement/questionnaire-python_advanced.json'), 'utf8'),
  );
  const publicSeedQ = {
    ok: true,
    questionnaire_id: 1,
    course_id: rawSeedQ.course_id,
    version: 1,
    title: rawSeedQ.title,
    params: rawSeedQ.params,
    modules: rawSeedQ.modules,
    self_assess: rawSeedQ.self_assess ?? [],
    items: rawSeedQ.items.map((it) => ({
      id: it.id,
      module_code: it.module_code,
      ...(it.level ? { level: it.level } : {}),
      question: it.question,
      code: it.code ?? null,
      options: it.options.map((o) => ({ text: o.text })),
    })),
  };
  assert.deepEqual(validateQuestionnaire(publicSeedQ), []);
  assert.ok(
    validateQuestionnaire({
      ...publicSeedQ,
      items: [{ ...publicSeedQ.items[0], correct: 0 }],
    }).length > 0,
    'validateQuestionnaire phải chặn items chứa correct',
  );
  assert.ok(
    validateQuestionnaire({
      ...publicSeedQ,
      items: [{ ...publicSeedQ.items[0], correctIndex: 0 }],
    }).length > 0,
    'validateQuestionnaire phải chặn items chứa correctIndex',
  );

  // 3. loadQuestionnaire gọi GET /api/questionnaire/:courseId & kiểm tra 404
  const apiLoad = await loadQuestionnaire('python_advanced', {
    useMock: false,
    fetcher: async (path) => {
      assert.equal(path, '/api/questionnaire/python_advanced');
      return { ok: true, status: 200, json: async () => publicSeedQ };
    },
  });
  assert.equal(apiLoad.source, 'api');
  assert.equal(apiLoad.questionnaire.questionnaire_id, 1);
  assert.equal(apiLoad.questionnaire.items.length, 24);
  assert.equal(
    resolvePlacementModuleTitle(apiLoad.questionnaire.modules, PY_MODULES, 'M9'),
    'M9 · Ôn tập và thực hành các chi tiết trong slide',
  );

  await assert.rejects(
    () =>
      loadQuestionnaire('python_advanced', {
        useMock: false,
        fetcher: async () => ({ ok: false, status: 404, json: async () => ({}) }),
      }),
    /Chưa có bộ câu hỏi đầu vào/,
  );

  // 4. buildQuestionnaireAnswersPayload lọc bỏ id lạ & self rỗng
  const sanitized = buildQuestionnaireAnswersPayload(
    'python_advanced',
    apiLoad.questionnaire,
    { 'q-m1-1': 0, 'q-m1-2': null, 'la-item': 1, 'q-m2-1': 99 },
    { 'sa-la': 1 },
  );
  assert.deepEqual(sanitized, {
    course_id: 'python_advanced',
    questionnaire_id: 1,
    answers: { 'q-m1-1': 0, 'q-m1-2': null },
  });
  assert.equal('self' in sanitized, false, 'đề không có self_assess thì không gửi trường self rỗng');

  // 5. submitQuestionnaireAndSurvey (API thật): gửi đúng 1 request POST /api/survey kèm trường questionnaire
  const submitCalls = [];
  let sentBody = null;
  const samplePlacementOutcome = {
    ok: true,
    done: true,
    updated: true,
    course_id: 'python_advanced',
    questionnaire_id: 1,
    version: 1,
    start_module: 'M3',
    start_lesson_no: 42,
    module_scores: { M1: 1, M2: 0.67, M3: 0.33 },
    review_modules: ['M4'],
    level_title: 'Nền tảng vững vàng',
    skipped_all: false,
    score: 14,
    total: 24,
    level: 'intermediate',
    explanations: { 'q-m1-1': 'Phép cộng hai số nguyên ra 19.' },
    review: [
      {
        item_id: 'q-m1-1',
        module_code: 'M1',
        picked: 0,
        correct: 0,
        is_correct: true,
        explanation: 'Phép cộng hai số nguyên ra 19.',
      },
    ],
  };

  const apiSubmitted = await submitQuestionnaireAndSurvey({
    courseId: 'python_advanced',
    questionnaire: apiLoad.questionnaire,
    answers: { 'q-m1-1': 0, 'q-m1-2': null },
    selfAnswers: {},
    surveyInput: { job: 'Sinh viên', purpose: ['Phân tích dữ liệu'], language: ['Python'] },
    modules: PY_MODULES,
    saveSurvey: true,
    useMock: false,
    fetcher: async (path, opts) => {
      submitCalls.push(path);
      sentBody = JSON.parse(opts.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          template: 'data',
          roadmap_id: 'u9_generated',
          placement: samplePlacementOutcome,
        }),
      };
    },
  });
  assert.deepEqual(submitCalls, ['/api/survey']);
  assert.equal(sentBody.job, 'Sinh viên');
  assert.equal(sentBody.purpose, 'Phân tích dữ liệu');
  assert.equal(sentBody.language, 'Python');
  assert.deepEqual(sentBody.questionnaire, {
    course_id: 'python_advanced',
    questionnaire_id: 1,
    answers: { 'q-m1-1': 0, 'q-m1-2': null },
  });
  assert.equal(apiSubmitted.placementSource, 'api');
  assert.equal(apiSubmitted.surveySaved, true);
  assert.equal(apiSubmitted.roadmapId, 'u9_generated');
  assert.equal(apiSubmitted.placement.start_module, 'M3');
  assert.equal(apiSubmitted.placement.start_lesson_no, 42);
  assert.equal(apiSubmitted.placement.updated, true);
  assert.equal(apiSubmitted.placement.review?.[0].is_correct, true);

  // Bỏ qua toàn bộ câu hỏi qua API thật -> skipped_all = true, start_module = M1
  const skippedRes = await submitQuestionnaireAndSurvey({
    courseId: 'python_advanced',
    questionnaire: apiLoad.questionnaire,
    answers: Object.fromEntries(apiLoad.questionnaire.items.map((it) => [it.id, null])),
    selfAnswers: {},
    surveyInput: {},
    modules: PY_MODULES,
    saveSurvey: true,
    useMock: false,
    fetcher: async (_path, opts) => {
      const parsed = JSON.parse(opts.body);
      assert.equal(Object.values(parsed.questionnaire.answers).every((v) => v === null), true);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          roadmap_id: 'u9_generated',
          placement: {
            ok: true,
            done: true,
            updated: false,
            start_module: 'M1',
            start_lesson_no: 1,
            module_scores: { M1: 0, M2: 0 },
            review_modules: [],
            level_title: 'Khởi đầu vững chắc',
            skipped_all: true,
            score: 0,
            total: 24,
          },
        }),
      };
    },
  });
  assert.equal(skippedRes.placement.skipped_all, true);
  assert.equal(skippedRes.placement.start_module, 'M1');
  assert.equal(skippedRes.placement.start_lesson_no, 1);

  // 6. Ca lỗi 409 (version conflict) & 400 (sai đáp án) từ POST /api/survey
  let caught409 = null;
  try {
    await submitQuestionnaireAndSurvey({
      courseId: 'python_advanced',
      questionnaire: apiLoad.questionnaire,
      answers: { 'q-m1-1': 0 },
      selfAnswers: {},
      surveyInput: {},
      modules: PY_MODULES,
      saveSurvey: true,
      useMock: false,
      fetcher: async () => ({ ok: false, status: 409, json: async () => ({ message: 'Bộ câu hỏi đã được cập nhật' }) }),
    });
  } catch (err) {
    caught409 = err;
  }
  assert.ok(caught409);
  assert.equal(isVersionConflictError(caught409), true);
  assert.match(caught409.message, /tải lại trang/);

  await assert.rejects(
    () =>
      submitQuestionnaireAndSurvey({
        courseId: 'python_advanced',
        questionnaire: apiLoad.questionnaire,
        answers: { 'q-m1-1': 0 },
        selfAnswers: {},
        surveyInput: {},
        modules: PY_MODULES,
        saveSurvey: true,
        useMock: false,
        fetcher: async () => ({
          ok: false,
          status: 400,
          json: async () => ({ message: 'answers: câu "x" không thuộc bộ câu đang dùng.' }),
        }),
      }),
    /Dữ liệu chưa hợp lệ: answers: câu "x" không thuộc bộ câu đang dùng/,
  );

  // 7. loadMyPlacement gọi GET /api/me/questionnaire/:courseId
  const notDone = await loadMyPlacement({
    courseId: 'python_advanced',
    fetcher: async (path) => {
      assert.equal(path, '/api/me/questionnaire/python_advanced');
      return { ok: true, status: 200, json: async () => ({ ok: true, done: false, course_id: 'python_advanced' }) };
    },
  });
  assert.equal(notDone, null);

  const donePlacement = await loadMyPlacement({
    courseId: 'python_advanced',
    fetcher: async (path) => {
      assert.equal(path, '/api/me/questionnaire/python_advanced');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ...samplePlacementOutcome,
          submitted_at: '2026-11-24T16:15:00.000Z',
        }),
      };
    },
  });
  assert.equal(donePlacement.start_module, 'M3');
  assert.equal(donePlacement.start_lesson_no, 42);
  assert.equal(donePlacement.module_scores.M1, 1);
  assert.deepEqual(donePlacement.review_modules, ['M4']);
  assert.equal(donePlacement.submitted_at, '2026-11-24T16:15:00.000Z');
});

test('submitCourseReset & submitDisplayName: cờ mock, API thật BE8, PUT /api/user và lỗi 400/403/429 thân thiện', async () => {
  const mockReset = await submitCourseReset('python_advanced', { useMock: true });
  assert.equal(mockReset.ok, true);
  assert.equal(mockReset.source, 'mock');
  assert.deepEqual(validateResetResponse(mockReset.data), []);

  const apiReset = await submitCourseReset('python_advanced', {
    useMock: false,
    fetcher: async (path, opts) => {
      assert.equal(path, '/api/courses/python_advanced/reset');
      assert.equal(opts.method, 'POST');
      return { ok: true, status: 200, json: async () => MOCK_RESET };
    },
  });
  assert.equal(apiReset.ok, true);
  assert.equal(apiReset.source, 'api');

  const unEnrolled = await submitCourseReset('python_advanced', {
    useMock: false,
    fetcher: async () => ({ ok: false, status: 403, json: async () => ({}) }),
  });
  assert.equal(unEnrolled.ok, false);
  assert.match(unEnrolled.message, /chưa ghi danh/i);

  const throttled = await submitCourseReset('python_advanced', {
    useMock: false,
    fetcher: async () => ({ ok: false, status: 429, json: async () => ({}) }),
  });
  assert.equal(throttled.ok, false);
  assert.match(throttled.message, /quá số lần/i);

  // Validate & đổi tên hiển thị
  assert.equal(validateDisplayName('   ').ok, false);
  assert.equal(validateDisplayName('A').ok, false);
  assert.equal(validateDisplayName('a'.repeat(41)).ok, false);
  assert.deepEqual(validateDisplayName('  Minh  Anh '), { ok: true, value: 'Minh Anh' });

  const renameApi = await submitDisplayName('Minh Anh', {
    signedIn: true,
    fetcher: async (path, opts) => {
      assert.equal(path, '/api/user');
      assert.equal(opts.method, 'PUT');
      assert.deepEqual(JSON.parse(opts.body), { name: 'Minh Anh' });
      return { ok: true, status: 200, json: async () => ({ ok: true, user: { name: 'Minh Anh' } }) };
    },
  });
  assert.deepEqual(renameApi, { ok: true, name: 'Minh Anh', source: 'api' });

  const rename400 = await submitDisplayName('Minh Anh', {
    signedIn: true,
    fetcher: async () => ({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Họ tên không hợp lệ' }),
    }),
  });
  assert.equal(rename400.ok, false);
  assert.equal(rename400.status, 400);
  assert.equal(friendlyApiError(400, { message: 'Họ tên không hợp lệ' }), 'Dữ liệu chưa hợp lệ: Họ tên không hợp lệ');
});

test('NỐI DÂY UI: OnboardingSurveyView tách passive load (apiFetchSessionOnly) với nút nộp (apiFetch), không đọc correctIndex hay /api/placement; LofiPhoneProfile giữ 0/0 mặc định', () => {
  const onboardingSrc = readFileSync(join(FE, 'src/components/onboarding/OnboardingSurveyView.tsx'), 'utf8');
  assert.match(onboardingSrc, /apiFetchSessionOnly\(/);
  assert.match(onboardingSrc, /\bapiFetch\b/);
  assert.ok(!onboardingSrc.includes('correctIndex'), 'UI onboarding không được chứa hay đọc correctIndex');
  assert.ok(!onboardingSrc.includes('/api/placement'), 'UI onboarding không còn gọi /api/placement');
  assert.equal(onboardingSrc.includes('Khảo sát chỉ dành cho tài khoản đã đăng nhập'), false, 'cả khách và người đăng nhập đều làm được bài test');
  assert.match(onboardingSrc, /loadQuestionnaire/);
  assert.match(onboardingSrc, /loadMyPlacement/);
  assert.match(onboardingSrc, /submitQuestionnaireAndSurvey/);
  assert.match(onboardingSrc, /max_duration_min/);
  assert.match(onboardingSrc, /mastery_threshold/);
  assert.match(onboardingSrc, /Xem lại đáp án/);
  assert.match(onboardingSrc, /\/api\/survey/);
  assert.match(onboardingSrc, /classifyOnboardingViewer/);

  const profileSrc = readFileSync(join(FE, 'src/components/profile/LofiPhoneProfile.tsx'), 'utf8');
  assert.ok(!/\bapiFetch\(/.test(profileSrc), 'LofiPhoneProfile chỉ dùng apiFetchSessionOnly');
  assert.ok(/apiFetchSessionOnly/.test(profileSrc));
  assert.match(profileSrc, /initialDoneLessons\s*=\s*0/);
  assert.match(profileSrc, /initialXp\s*=\s*0/);
  assert.match(profileSrc, /submitCourseReset/);
  assert.match(profileSrc, /submitDisplayName/);
  assert.match(profileSrc, /Học lại khoá này/);
});
