import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { ZodPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminGuard } from '../auth/admin.guard.js';
import {
  featureSchema,
  instagramPostSchema,
  type InstagramPostInput,
} from './admin-instagram.dto.js';

function toData(body: InstagramPostInput) {
  return {
    ...body,
    postedOn: new Date(`${body.postedOn}T00:00:00Z`),
    retention: body.retention ?? Prisma.JsonNull,
  };
}

/** 인스타 게시물 기록·성과 숫자, 홈 대표 사건 지정 */
@Controller('admin/instagram')
@UseGuards(AdminGuard)
export class AdminInstagramController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('posts')
  async list() {
    const [posts, featured] = await Promise.all([
      this.prisma.instagramPost.findMany({ orderBy: { postedOn: 'desc' }, take: 200 }),
      this.prisma.case.findMany({
        where: { isHomeFeatured: true },
        select: { slug: true, title: true },
      }),
    ]);
    return {
      items: posts.map((p) => ({ ...p, postedOn: p.postedOn.toISOString().slice(0, 10) })),
      featured,
    };
  }

  @Post('posts')
  async create(@Body(new ZodPipe(instagramPostSchema)) body: InstagramPostInput) {
    await this.prisma.instagramPost.create({ data: toData(body) });
    return { ok: true };
  }

  @Patch('posts/:id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(instagramPostSchema)) body: InstagramPostInput) {
    await this.prisma.instagramPost.update({ where: { id }, data: toData(body) });
    return { ok: true };
  }

  @Delete('posts/:id')
  @HttpCode(200)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.prisma.instagramPost.delete({ where: { id } });
    return { ok: true };
  }

  /** 홈 "지금 살펴볼 사건"에서 먼저 보여 줄 사건 지정·해제 */
  @Patch('feature/:slug')
  async feature(@Param('slug') slug: string, @Body(new ZodPipe(featureSchema)) body: { featured: boolean }) {
    const found = await this.prisma.case.findUnique({ where: { slug }, select: { id: true } });
    if (!found) throw new NotFoundException('사건을 찾을 수 없습니다.');
    await this.prisma.case.update({ where: { id: found.id }, data: { isHomeFeatured: body.featured } });
    return { ok: true };
  }
}
