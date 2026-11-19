import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/auth/admin.guard.js';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  inquiryListSchema,
  inquiryStatusSchema,
  replySchema,
  type InquiryListQuery,
  type InquiryStatusInput,
  type ReplyInput,
} from './dto/inquiries.dto.js';
import { InquiriesService } from './inquiries.service.js';

/** 문의·의견 확인과 답변 */
@Controller('admin/inquiries')
@UseGuards(AdminGuard)
export class InquiriesAdminController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Get()
  list(@Query(new ZodPipe(inquiryListSchema)) query: InquiryListQuery) {
    return this.inquiries.adminList(query);
  }

  @Post(':id/reply')
  @HttpCode(200)
  reply(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(replySchema)) body: ReplyInput) {
    return this.inquiries.reply(id, body.reply);
  }

  @Patch(':id')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(inquiryStatusSchema)) body: InquiryStatusInput) {
    return this.inquiries.setStatus(id, body.status);
  }
}
