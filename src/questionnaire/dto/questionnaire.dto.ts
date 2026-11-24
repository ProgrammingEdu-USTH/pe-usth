import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

/**
 * Câu trả lời bộ câu hỏi đầu vào (docs/questionnaire-spec.md §3):
 *   answers = { [id câu]: chỉ số lựa chọn | null }, self = { [id câu tự khai]: chỉ số | null }.
 * DTO chỉ kiểm KIỂU (object); id câu có thuộc bộ câu đang dùng không và chỉ số có nằm trong
 * khoảng không phải đối chiếu với bộ câu trong DB, nên service kiểm (`checkAnswers`) và trả 400.
 * Dùng chung cho POST /questionnaire/:courseId/submit và trường `questionnaire` của POST /survey.
 */
export class QuestionnaireAnswersDto {
  /** Chỉ dùng khi gửi kèm POST /survey (route submit đã có courseId trên đường dẫn). */
  @IsOptional()
  @IsString({ message: 'course_id không hợp lệ' })
  @Matches(/^[a-z0-9_]{1,64}$/, { message: 'course_id không hợp lệ' })
  course_id?: string;

  /** Bản câu hỏi FE đã tải; khác bản đang bật thì 409 "tải lại trang" (giống /placement). */
  @IsOptional()
  @IsInt({ message: 'questionnaire_id phải là số nguyên' })
  questionnaire_id?: number;

  @IsObject({ message: 'answers phải là object { id câu: chỉ số lựa chọn }' })
  answers!: Record<string, number | null>;

  @IsOptional()
  @IsObject({ message: 'self phải là object { id câu: chỉ số lựa chọn }' })
  self?: Record<string, number | null>;
}
