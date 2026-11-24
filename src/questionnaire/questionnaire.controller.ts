import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorators';
import { QuestionnaireAnswersDto } from './dto/questionnaire.dto';
import {
  DEFAULT_COURSE_ID,
  QuestionnaireService,
} from './questionnaire.service';

/**
 * Bộ câu hỏi đầu vào theo module. Route theo sheet (GET /api/questionnaire) và theo
 * docs/questionnaire-spec.md §5 (/api/questionnaire/:courseId…) cùng gọi một service,
 * để FE nối theo tài liệu nào cũng được. /api/placement/* (điểm tổng) vẫn giữ nguyên.
 */
@Controller()
export class QuestionnaireController {
  constructor(private readonly questionnaire: QuestionnaireService) {}

  // Công khai như /placement/questions: không kèm đáp án nên khách chưa có tài khoản xem
  // được; trang công khai gọi bằng apiFetchSessionOnly (không tự tạo khách).
  @Public()
  @Get('questionnaire')
  getDefault(@Query('course_id') courseId?: string) {
    return this.questionnaire.getQuestionnaire(courseId || DEFAULT_COURSE_ID);
  }

  @Public()
  @Get('questionnaire/:courseId')
  get(@Param('courseId') courseId: string) {
    return this.questionnaire.getQuestionnaire(courseId);
  }

  // Cần JWT: lúc NỘP mới cần danh tính để lưu kết quả.
  @Post('questionnaire/:courseId/submit')
  @HttpCode(HttpStatus.OK)
  submit(
    @CurrentUserId() userId: number,
    @Param('courseId') courseId: string,
    @Body() dto: QuestionnaireAnswersDto,
  ) {
    return this.questionnaire.submit(userId, courseId, dto);
  }

  @Get('me/questionnaire/:courseId')
  mine(@CurrentUserId() userId: number, @Param('courseId') courseId: string) {
    return this.questionnaire.getMine(userId, courseId);
  }
}
