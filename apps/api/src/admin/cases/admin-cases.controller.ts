import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ZodPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AdminGuard } from '../auth/admin.guard.js';
import {
  caseEditSchema,
  caseListSchema,
  publishSchema,
  relatedAddSchema,
  reviewSchema,
  sourceAddSchema,
  type RelatedAdd,
  type CaseEdit,
  type CaseListQuery,
  type PublishInput,
  type ReviewInput,
  type SourceAdd,
} from './dto/admin-cases.dto.js';
import { AdminCasesService } from './admin-cases.service.js';

/** 사건 검토·수정·공개 */
@Controller('admin/cases')
@UseGuards(AdminGuard)
export class AdminCasesController {
  constructor(private readonly cases: AdminCasesService) {}

  @Get()
  list(@Query(new ZodPipe(caseListSchema)) query: CaseListQuery) {
    return this.cases.list(query);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.cases.detail(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(caseEditSchema)) body: CaseEdit) {
    return this.cases.update(id, body);
  }

  @Post(':id/review')
  @HttpCode(200)
  review(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(reviewSchema)) body: ReviewInput) {
    return this.cases.review(id, body.status, body.note);
  }

  @Post(':id/publish')
  @HttpCode(200)
  publish(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(publishSchema)) body: PublishInput) {
    return this.cases.publish(id, body.published);
  }

  /** 사건방에 넣지 않을 초안을 지움. 공개 중인 사건은 먼저 비공개로 바꿔야 함 */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cases.remove(id);
  }

  @Post(':id/sources')
  addSource(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(sourceAddSchema)) body: SourceAdd) {
    return this.cases.addSource(id, body);
  }

  @Delete(':id/sources/:sourceId')
  removeSource(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    return this.cases.removeSource(id, sourceId);
  }

  /** 관련 콘텐츠(방송·다큐·유튜브 등) 추가·수정·삭제 */
  @Post(':id/related')
  addRelated(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(relatedAddSchema)) body: RelatedAdd) {
    return this.cases.addRelated(id, body);
  }

  @Patch(':id/related/:relatedId')
  updateRelated(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('relatedId', ParseUUIDPipe) relatedId: string,
    @Body(new ZodPipe(relatedAddSchema)) body: RelatedAdd,
  ) {
    return this.cases.updateRelated(id, relatedId, body);
  }

  @Delete(':id/related/:relatedId')
  removeRelated(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('relatedId', ParseUUIDPipe) relatedId: string,
  ) {
    return this.cases.removeRelated(id, relatedId);
  }
}
