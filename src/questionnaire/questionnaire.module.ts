import { Module } from '@nestjs/common';
import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireService } from './questionnaire.service';

@Module({
  controllers: [QuestionnaireController],
  providers: [QuestionnaireService],
  // UserModule dùng để chấm phần `questionnaire` gửi kèm POST /survey.
  exports: [QuestionnaireService],
})
export class QuestionnaireModule {}
