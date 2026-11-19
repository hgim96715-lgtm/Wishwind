import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/auth/admin.guard.js';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  opinionSchema,
  postListSchema,
  postPatchSchema,
  postSchema,
  type OpinionRequest,
  type PostInput,
  type PostListQuery,
  type PostPatch,
} from './dto/briefing.dto.js';
import { BriefingAdminService } from './briefing-admin.service.js';

/** 브리핑 글 (공지·새 소식·사건 변경·의견 요약) 관리 */
@Controller('admin/briefing')
@UseGuards(AdminGuard)
export class BriefingAdminController {
  constructor(private readonly briefing: BriefingAdminService) {}

  @Get()
  list(@Query(new ZodPipe(postListSchema)) query: PostListQuery) {
    return this.briefing.list(query);
  }

  /** ':id'보다 먼저 선언해야 'opinion-summary'가 id로 잡히지 않음 */
  @Post('opinion-summary')
  draftOpinion(@Body(new ZodPipe(opinionSchema)) body: OpinionRequest) {
    return this.briefing.draftOpinionSummary(body.caseId);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.briefing.get(id);
  }

  @Post()
  create(@Body(new ZodPipe(postSchema)) body: PostInput) {
    return this.briefing.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(postPatchSchema)) body: PostPatch) {
    return this.briefing.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.briefing.remove(id);
  }
}
