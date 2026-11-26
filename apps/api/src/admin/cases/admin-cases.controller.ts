import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ZodPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AdminGuard } from '../auth/admin.guard.js';
import {
  caseEditSchema,
  caseListSchema,
  filePickSchema,
  publishSchema,
  changeAddSchema,
  relatedAddSchema,
  reviewSchema,
  sourceAddSchema,
  timelineAddSchema,
  type ChangeAdd,
  type RelatedAdd,
  type CaseEdit,
  type CaseListQuery,
  type FilePickInput,
  type PublishInput,
  type ReviewInput,
  type SourceAdd,
  type TimelineAdd,
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

  /** 사건방 '오늘의 사건 파일'에 고정·해제 (공개 사건만, 최대 3건) */
  @Post(':id/file-pick')
  @HttpCode(200)
  filePick(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(filePickSchema)) body: FilePickInput) {
    return this.cases.setFilePick(id, body.picked);
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

  /** 사건이 바꾼 것(법·기념일·제도) 추가·수정·삭제 */
  @Post(':id/changes')
  addChange(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(changeAddSchema)) body: ChangeAdd) {
    return this.cases.addChange(id, body);
  }

  @Patch(':id/changes/:changeId')
  updateChange(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('changeId', ParseUUIDPipe) changeId: string,
    @Body(new ZodPipe(changeAddSchema)) body: ChangeAdd,
  ) {
    return this.cases.updateChange(id, changeId, body);
  }

  @Delete(':id/changes/:changeId')
  removeChange(@Param('id', ParseUUIDPipe) id: string, @Param('changeId', ParseUUIDPipe) changeId: string) {
    return this.cases.removeChange(id, changeId);
  }

  /** 타임라인 추가·수정·삭제 */
  @Post(':id/timeline')
  addTimeline(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(timelineAddSchema)) body: TimelineAdd) {
    return this.cases.addTimeline(id, body);
  }

  @Patch(':id/timeline/:eventId')
  updateTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body(new ZodPipe(timelineAddSchema)) body: TimelineAdd,
  ) {
    return this.cases.updateTimeline(id, eventId, body);
  }

  @Delete(':id/timeline/:eventId')
  removeTimeline(@Param('id', ParseUUIDPipe) id: string, @Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.cases.removeTimeline(id, eventId);
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
