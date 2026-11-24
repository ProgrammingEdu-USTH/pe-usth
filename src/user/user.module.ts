import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { QuestionnaireModule } from 'src/questionnaire/questionnaire.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  // AuthModule export CachedUserService — cần để invalidate cache sau khi update user.
  // QuestionnaireModule: chấm phần `questionnaire` gửi kèm POST /survey.
  imports: [AuthModule, QuestionnaireModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
