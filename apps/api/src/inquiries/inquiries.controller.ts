import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import { OptionalVoterId, VoterId } from '../common/decorators/voter-id.decorator.js';
import { inquirySchema, type InquiryInput } from './dto/inquiries.dto.js';
import { InquiriesService } from './inquiries.service.js';

/** 문의·의견 보내기 (공개). 투표자 ID는 Next 서버가 httpOnly 쿠키에서 꺼내 헤더로 넘김 */
@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Post()
  @HttpCode(200)
  create(
    @VoterId() voterId: string,
    @Body(new ZodPipe(inquirySchema)) body: InquiryInput,
  ) {
    return this.inquiries.create(voterId, body);
  }

  /** 쿠키가 아직 없는 첫 방문이면 빈 목록 */
  @Get('mine')
  mine(@OptionalVoterId() voterId: string | undefined) {
    return voterId ? this.inquiries.mine(voterId) : [];
  }
}
