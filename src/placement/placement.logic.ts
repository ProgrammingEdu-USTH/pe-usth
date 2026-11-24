/**
 * Logic thuần của bài kiểm tra đầu vào (không đụng DB, để test được và đổi được mà không cần migration).
 *
 * Dạng một câu hỏi trong `questionnaires.questions_json` — CÙNG hình với 5 câu mẫu đang cứng ở
 * frontend (OnboardingSurveyView.tsx), nên dán bộ câu hỏi thật vào là chạy:
 *   { id, topic, question, code?, options: string[], correctIndex }
 * `correctIndex` là ĐÁP ÁN ĐÚNG: chỉ server được thấy. publicView() bỏ nó trước khi gửi ra
 * (bẫy "lộ đáp án" trong AGENTS.md: spec phải giữ fixture đúng hình dữ liệu thật).
 */
import {
  isQuestionnaireDoc,
  parseQuestionnaireDoc,
} from '../questionnaire/questionnaire.logic';

export type PlacementQuestion = {
  id: number;
  topic: string;
  question: string;
  code?: string;
  options: string[];
  correctIndex: number;
};

export type PublicQuestion = Omit<PlacementQuestion, 'correctIndex'>;

export type PlacementLevel = 'beginner' | 'intermediate' | 'advanced';

/** Tối đa lựa chọn mỗi câu: chặn payload bất thường và giữ answers vừa SMALLINT. */
export const MAX_OPTIONS = 10;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Bộ câu định dạng theo module (docs/questionnaire-spec.md §2, src/questionnaire/) →
 * dạng câu của placement. Cả hai route đọc CÙNG bản `is_active` của bảng `questionnaires`,
 * nên thiếu nhánh này thì nạp bộ câu mới (scripts/seed-questionnaire.ts) là
 * `/placement/questions` ném 500 "phải là mảng" — mà FE đang gọi đúng route đó.
 * Thứ tự câu giữ nguyên: answers[i] của placement và của questionnaire trỏ cùng một câu.
 */
function fromQuestionnaireDoc(json: unknown): PlacementQuestion[] {
  const doc = parseQuestionnaireDoc(json);
  return doc.items.map((it, i) => ({
    id: i + 1,
    topic: it.module_code,
    question: it.question,
    ...(it.code ? { code: it.code } : {}),
    options: it.options.map((o) => o.text),
    correctIndex: it.correct,
  }));
}

/**
 * Kiểm `questions_json` đọc từ DB hoặc từ file nạp. Ném Error có câu tiếng Việt chỉ rõ câu nào sai:
 * dữ liệu sai hình mà để lọt thì người học thấy nút trắng hoặc câu không có đáp án đúng,
 * và không có log nào đỏ (cùng kiểu lỗi với `normalizeQuestion` ở kho quiz).
 * Nhận cả bản mảng cũ lẫn bộ câu theo module (object có `items`).
 */
export function parseQuestions(json: unknown): PlacementQuestion[] {
  if (isQuestionnaireDoc(json)) return fromQuestionnaireDoc(json);
  if (!Array.isArray(json) || json.length === 0)
    throw new Error('Bộ câu hỏi phải là mảng có ít nhất 1 câu.');
  const seen = new Set<number>();
  return json.map((raw, i) => {
    const at = `Câu #${i + 1}`;
    if (!isObj(raw)) throw new Error(`${at}: phải là object.`);
    const { id, topic, question, code, options, correctIndex } = raw;
    if (typeof id !== 'number' || !Number.isInteger(id) || seen.has(id))
      throw new Error(`${at}: id phải là số nguyên, không trùng.`);
    seen.add(id);
    if (typeof question !== 'string' || !question.trim())
      throw new Error(`${at}: thiếu nội dung câu hỏi.`);
    if (
      !Array.isArray(options) ||
      options.length < 2 ||
      options.length > MAX_OPTIONS ||
      options.some((o) => typeof o !== 'string' || !o.trim())
    )
      throw new Error(
        `${at}: options phải là 2–${MAX_OPTIONS} chuỗi không rỗng.`,
      );
    if (
      typeof correctIndex !== 'number' ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= options.length
    )
      throw new Error(`${at}: correctIndex nằm ngoài danh sách options.`);
    return {
      id,
      topic: typeof topic === 'string' ? topic : '',
      question,
      ...(typeof code === 'string' ? { code } : {}),
      options: options as string[],
      correctIndex,
    };
  });
}

/** Bản gửi ra FE: KHÔNG có correctIndex. */
export function publicView(questions: PlacementQuestion[]): PublicQuestion[] {
  return questions.map((q) => {
    const rest: Partial<PlacementQuestion> = { ...q };
    delete rest.correctIndex;
    return rest as PublicQuestion;
  });
}

/**
 * Chấm theo THỨ TỰ câu của bản câu hỏi: answers[i] là lựa chọn cho câu thứ i (-1 = bỏ qua).
 * Trả null nếu answers không hợp lệ (sai độ dài, ngoài khoảng) để service trả 400 thay vì chấm bừa.
 */
export function grade(
  questions: PlacementQuestion[],
  answers: number[],
): { score: number; total: number } | null {
  if (answers.length !== questions.length) return null;
  let score = 0;
  for (let i = 0; i < questions.length; i++) {
    const a = answers[i];
    if (!Number.isInteger(a) || a < -1 || a >= questions[i].options.length)
      return null;
    if (a === questions[i].correctIndex) score++;
  }
  return { score, total: questions.length };
}

/**
 * Điểm → cấp độ. Ngưỡng nằm Ở ĐÂY (không ở DB) nên đổi được mà không cần migration;
 * giá trị là điểm khởi đầu, chưa hiệu chỉnh bằng dữ liệu thật.
 */
export function levelFromScore(score: number, total: number): PlacementLevel {
  const r = total > 0 ? score / total : 0;
  if (r < 0.4) return 'beginner';
  if (r < 0.8) return 'intermediate';
  return 'advanced';
}
