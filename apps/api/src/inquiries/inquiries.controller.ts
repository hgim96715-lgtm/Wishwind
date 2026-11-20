import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import { OptionalVoterId, VoterId } from '../common/decorators/voter-id.decorator.js';
import { inquiryEditSchema, inquirySchema, type InquiryEditInput, type InquiryInput } from './dto/inquiries.dto.js';
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

  @Put(':id')
  edit(
    @VoterId() voterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(inquiryEditSchema)) body: InquiryEditInput,
  ) {
    return this.inquiries.editMine(voterId, id, body.body);
  }

  /** 프록시가 PUT·POST만 넘기므로 지우기도 POST로 받음 */
  @Post(':id/delete')
  @HttpCode(200)
  remove(@VoterId() voterId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.inquiries.deleteMine(voterId, id);
  }

  /** 쿠키가 아직 없는 첫 방문이면 빈 목록 */
  @Get('mine')
  mine(@OptionalVoterId() voterId: string | undefined) {
    return voterId ? this.inquiries.mine(voterId) : [];
  }
}
