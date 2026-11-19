import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Db } from '../common/prisma/db.js';
import {
  CaseReviewStatus,
  CaseStatus,
  DatePrecision,
  NewsStatus,
} from '../generated/prisma/enums.js';
import type { NewsAction, NewsCaseInput } from './dto/news.dto.js';
import {
  displayTitle,
  regionToCountry,
  toAdminNewsItem,
  toCaseSource,
  toTimelineEvent,
} from './news.mapper.js';
import { NewsRepository, type NewsRow } from './news.repository.js';
import { PapagoTranslator } from './papago.js';

@Injectable()
export class NewsAdminService {
  constructor(
    private readonly repo: NewsRepository,
    private readonly papago: PapagoTranslator,
  ) {}

  async list(status: NewsStatus, scope: 'kr' | 'foreign') {
    const region = scope === 'kr' ? 'KR' : { not: 'KR' };
    const [items, counts, candidates] = await Promise.all([
      this.repo.listByStatus(status, region),
      this.repo.countByStatus(region),
      this.repo.caseCandidates(),
    ]);
    return {
      items: items.map((n) => toAdminNewsItem(n, candidates)),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
      papago: this.papago.isConfigured(),
    };
  }

  /** 확인하지 않은 새 기사를 한 번에 숨김 */
  async dismissAllNew() {
    const { count } = await this.repo.dismissAllNew();
    return { dismissed: count };
  }

  private async findNews(id: string) {
    const found = await this.repo.findRow(id);
    if (!found) throw new NotFoundException('기사를 찾을 수 없습니다.');
    return found;
  }

  async setStatus(id: string, input: NewsAction) {
    const found = await this.findNews(id);
    // 해외 기사: 관리자가 쓴 제목 > 이미 번역한 제목 > 공개할 때 Papago 번역
    let titleKo = input.titleKo || found.titleKo;
    if (!titleKo && input.status === NewsStatus.PUBLISHED && found.lang !== 'ko') {
      titleKo = await this.papago.toKorean(found.title, found.lang);
    }
    return this.repo.transaction(async (tx) => {
      const saved = await this.repo.update(
        id,
        {
          status: input.status,
          titleKo: titleKo ?? null,
          reviewedAt: new Date(),
          ...(input.caseId !== undefined && { caseId: input.caseId }),
        },
        tx,
      );
      if (input.caseId && input.caseId !== found.caseId) {
        await this.attachToCase({ ...found, titleKo: titleKo ?? null }, input.caseId, input.timelineTitle, tx);
      }
      return saved;
    });
  }

  /**
   * 기사 하나로 '수사 중' 사건 초안을 만듦. 비공개 초안이라 관리실에서 검토해야 공개됨.
   * 출처가 1곳뿐이라 검증 완료가 안 되므로, 후속 기사를 연결해 출처 2곳을 채운 뒤 공개함
   */
  async createCase(id: string, input: NewsCaseInput) {
    const found = await this.findNews(id);
    return this.createDraftFromNews(found, input, `새 뉴스에서 만든 사건입니다: ${found.url}`);
  }

  /**
   * 기사 → '수사 중' 비공개 초안 (관리자 버튼, 자동 분류 공용).
   * 기사는 첫 출처·타임라인 한 줄로 붙고, 기사에는 사건이 연결됨
   */
  createDraftFromNews(found: NewsRow, input: NewsCaseInput, reviewNote: string) {
    const day = (found.publishedAt ?? new Date()).toISOString().slice(0, 10).replaceAll('-', '');
    return this.repo.transaction(async (tx) => {
      const created = await this.repo.createCase(
        {
          slug: `news-${day}-${randomBytes(3).toString('hex')}`,
          title: input.title,
          summary: input.summary,
          country: regionToCountry(found.region),
          category: input.category,
          status: CaseStatus.IN_PROGRESS,
          location: input.location ?? null,
          occurredAt: null,
          occurredAtPrecision: DatePrecision.UNKNOWN,
          reviewStatus: CaseReviewStatus.DRAFT,
          isPublished: false,
          reviewNote: reviewNote.slice(0, 1000),
        },
        tx,
      );
      await this.repo.update(found.id, { caseId: created.id, reviewedAt: new Date() }, tx);
      await this.attachToCase(found, created.id, input.timelineTitle, tx);
      return created;
    });
  }

  /**
   * 기사를 사건에 붙임: 출처로 기록하고, 타임라인에 한 줄 추가하고,
   * 공개 사건이면 재확인 필요로 바꾸고 브리핑룸 '사건 변경' 초안을 만듦 (관리자가 확인 후 공개)
   */
  private async attachToCase(news: NewsRow, caseId: string, timelineTitle: string | undefined, tx: Db) {
    const target = await this.repo.findCaseForAttach(caseId, tx);
    if (!target) throw new NotFoundException('연결할 사건을 찾을 수 없습니다.');

    await this.repo.upsertSource(caseId, news.url, toCaseSource(news), tx);

    const eventTitle = (timelineTitle ?? displayTitle(news)).slice(0, 200);
    if (!target.timeline.some((t) => t.title === eventTitle)) {
      const nextOrder = Math.max(-1, ...target.timeline.map((t) => t.sortOrder)) + 1;
      await this.repo.createTimelineEvent(toTimelineEvent(news, caseId, eventTitle, nextOrder), tx);
    }

    await this.repo.updateCase(
      caseId,
      target.isPublished ? { reviewStatus: CaseReviewStatus.NEEDS_REVIEW } : { updatedAt: new Date() },
      tx,
    );
    if (target.isPublished) {
      await this.repo.createCaseUpdateDraft(
        caseId,
        `‘${target.title}’ 사건에 새 소식이 있습니다`,
        `${news.publisher} 보도: ${displayTitle(news)}. 자세한 내용은 사건 파일의 타임라인에서 확인할 수 있습니다.`,
        tx,
      );
    }
  }
}
