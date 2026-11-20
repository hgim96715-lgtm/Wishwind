import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { OptionalVoterId, VoterId } from '../common/decorators/voter-id.decorator.js';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import { CaseNotesService } from './case-notes.service.js';
import {
  answerSchema,
  questionSchema,
  reportSchema,
  type AnswerInput,
  type QuestionInput,
  type ReportInput,
} from './dto/case-notes.dto.js';

/** 브라우저가 아니라 Next 서버가 호출함. 투표자 ID는 httpOnly 쿠키에서 꺼내 헤더로 넘김 */
@Controller('case-notes/:slug')
export class CaseNotesController {
  constructor(private readonly notes: CaseNotesService) {}

  @Get()
  get(@Param('slug') slug: string, @OptionalVoterId() voterId?: string) {
    return this.notes.getNotes(slug, voterId);
  }

  @Put('answers/:questionId')
  saveAnswer(
    @Param('slug') slug: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @VoterId() voterId: string,
    @Body(new ZodPipe(answerSchema)) input: AnswerInput,
  ) {
    return this.notes.saveAnswer(slug, questionId, voterId, input.body);
  }

  /** 내 노트 지우기. 프록시가 PUT·POST만 넘기므로 POST로 받음 */
  @Post('answers/:questionId/delete')
  @HttpCode(200)
  deleteAnswer(
    @Param('slug') slug: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @VoterId() voterId: string,
  ) {
    return this.notes.deleteAnswer(slug, questionId, voterId);
  }

  @Put('answers/:answerId/empathy')
  empathy(
    @Param('slug') slug: string,
    @Param('answerId', ParseUUIDPipe) answerId: string,
    @VoterId() voterId: string,
  ) {
    return this.notes.markEmpathy(slug, answerId, voterId);
  }

  @Post('questions')
  @HttpCode(200)
  saveQuestion(
    @Param('slug') slug: string,
    @VoterId() voterId: string,
    @Body(new ZodPipe(questionSchema)) input: QuestionInput,
  ) {
    return this.notes.saveQuestion(slug, voterId, input.body);
  }

  @Put('questions/:id/curious')
  curious(
    @Param('slug') slug: string,
    @Param('id', ParseUUIDPipe) id: string,
    @VoterId() voterId: string,
  ) {
    return this.notes.markCurious(slug, id, voterId);
  }

  @Post('reports')
  @HttpCode(200)
  report(
    @Param('slug') slug: string,
    @VoterId() voterId: string,
    @Body(new ZodPipe(reportSchema)) input: ReportInput,
  ) {
    return this.notes.report(slug, input.target, input.id, voterId, input.reason);
  }
}
