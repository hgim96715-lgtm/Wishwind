import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ZodPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AdminGuard } from '../auth/admin.guard.js';
import {
  blockSchema,
  contentTypeSchema,
  moderationActionSchema,
  moderationListSchema,
  type BlockInput,
  type ContentType,
  type ModerationActionInput,
  type ModerationListQuery,
} from './dto/admin-moderation.dto.js';
import { AdminModerationService } from './admin-moderation.service.js';

/** 부적절한 글 확인과 작성자(익명 voterId) 참여 제한 */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminModerationController {
  constructor(private readonly moderation: AdminModerationService) {}

  @Get('moderation')
  list(@Query(new ZodPipe(moderationListSchema)) query: ModerationListQuery) {
    return this.moderation.list(query);
  }

  @Post('moderation/:type/:id')
  @HttpCode(200)
  act(
    @Param('type', new ZodPipe(contentTypeSchema)) type: ContentType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(moderationActionSchema)) body: ModerationActionInput,
  ) {
    return this.moderation.act(type, id, body.action);
  }

  @Get('voters')
  listBlocked() {
    return this.moderation.listBlocked();
  }

  @Get('voters/:voterId')
  voter(@Param('voterId', ParseUUIDPipe) voterId: string) {
    return this.moderation.voter(voterId);
  }

  @Post('voters/:voterId/block')
  @HttpCode(200)
  block(@Param('voterId', ParseUUIDPipe) voterId: string, @Body(new ZodPipe(blockSchema)) body: BlockInput) {
    return this.moderation.block(voterId, body.reason);
  }

  @Delete('voters/:voterId/block')
  unblock(@Param('voterId', ParseUUIDPipe) voterId: string) {
    return this.moderation.unblock(voterId);
  }
}
