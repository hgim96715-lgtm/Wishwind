import { Injectable } from '@nestjs/common';
import { AdminOverviewRepository } from './admin-overview.repository.js';

/** 관리자 첫 화면: 지금 손봐야 할 일의 개수 */
@Injectable()
export class AdminOverviewService {
  constructor(private readonly repo: AdminOverviewRepository) {}

  async get() {
    const [cases, moderation, inquiries, briefing] = await Promise.all([
      this.repo.caseCounts(),
      this.repo.moderationCounts(),
      this.repo.inquiryCounts(),
      this.repo.briefingCounts(),
    ]);
    return { cases, moderation, inquiries, briefing };
  }
}
