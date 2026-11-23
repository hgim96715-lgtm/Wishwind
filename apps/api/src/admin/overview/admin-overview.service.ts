import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { AdminOverviewRepository } from './admin-overview.repository.js';

/** 매일 새벽 사건 수집은 claude.ai 예약 작업(한국 시간 01:52)이 '사건 파일 올리기' API로 넣음 */
const NIGHTLY_AT = '매일 새벽 1시 52분';

/** 관리자 첫 화면: 지금 손봐야 할 일의 개수 */
@Injectable()
export class AdminOverviewService {
  constructor(
    private readonly repo: AdminOverviewRepository,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async get() {
    const [cases, moderation, inquiries, briefing, last] = await Promise.all([
      this.repo.caseCounts(),
      this.repo.moderationCounts(),
      this.repo.inquiryCounts(),
      this.repo.briefingCounts(),
      this.repo.lastJobRuns(),
    ]);
    return { cases, moderation, inquiries, briefing, jobs: this.jobs(last) };
  }

  /** 관리실 '자동 작업' 안내: 언제, 무엇을 하는지, 마지막으로 한 때 */
  private jobs(last: { nightly: Date | null; news: Date | null; missing: Date | null }) {
    const newsOn = this.config.get('NEWS_SYNC_ENABLED', { infer: true });
    const missingOn = this.config.get('MISSING_SYNC_ENABLED', { infer: true });
    return [
      {
        key: 'nightly',
        name: '새벽 사건 수집',
        schedule: NIGHTLY_AT,
        description: '새로운 사건 12건을 조사해 비공개 초안으로 넣습니다. 확인한 뒤 공개해 주세요.',
        lastAt: last.nightly,
        enabled: true,
      },
      {
        key: 'news',
        name: '새 소식(뉴스) 수집',
        schedule: `${this.config.get('NEWS_SYNC_INTERVAL_HOURS', { infer: true })}시간마다`,
        description: '사건·실종 관련 기사를 모아 AI가 분류합니다. 애매한 기사는 ‘확인 안 한 새 뉴스’로 남습니다.',
        lastAt: last.news,
        enabled: newsOn,
      },
      {
        key: 'missing',
        name: '실종자 정보 동기화',
        schedule: `${this.config.get('MISSING_SYNC_INTERVAL_HOURS', { infer: true })}시간마다`,
        description: '경찰청 안전Dream과 FBI 공개 자료에서 실종자 정보를 새로 받아 실종자들의 정원 등불을 고칩니다.',
        lastAt: last.missing,
        enabled: missingOn,
      },
      {
        key: 'clouds',
        name: '보류된 바람개비 다시 검사',
        schedule: '1시간마다',
        description: 'AI 검사가 일시적인 오류로 보류한 응원 메시지를 다시 검사해 공개합니다.',
        lastAt: null,
        enabled: true,
      },
    ];
  }
}
