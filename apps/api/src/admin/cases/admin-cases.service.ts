import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { reviewCase, setPublished } from '../../case-import/case-import.repository.js';
import { asBadRequest } from '../../common/errors/as-bad-request.js';
import type { CaseReviewStatus } from '../../generated/prisma/enums.js';
import type { CaseEdit, CaseListQuery, RelatedAdd, SourceAdd } from './dto/admin-cases.dto.js';
import { newCaseDraft, statusChangedDraft, toAdminCaseRow, toReviewCounts } from './admin-cases.mapper.js';
import { AdminCasesRepository } from './admin-cases.repository.js';

@Injectable()
export class AdminCasesService {
  constructor(private readonly repo: AdminCasesRepository) {}

  async list(query: CaseListQuery) {
    const [items, counts] = await Promise.all([this.repo.list(query), this.repo.countByReview()]);
    return { items: items.map(toAdminCaseRow), counts: toReviewCounts(counts) };
  }

  async detail(id: string) {
    const found = await this.repo.findDetail(id);
    if (!found) throw new NotFoundException('사건을 찾을 수 없습니다.');
    return found;
  }

  private async findOrThrow(id: string) {
    const found = await this.repo.findSummary(id);
    if (!found) throw new NotFoundException('사건을 찾을 수 없습니다.');
    return found;
  }

  /** 공개 사건의 상태가 바뀌면 브리핑룸 '사건 변경' 초안을 만듦 */
  async update(id: string, edit: CaseEdit) {
    const before = await this.findOrThrow(id);
    const updated = await this.repo.update(id, edit);
    if (edit.status && edit.status !== before.status && before.isPublished) {
      const draft = statusChangedDraft(updated.title, before.status, edit.status);
      await this.repo.createCaseUpdateDraft(id, draft.title, draft.body);
    }
    return this.detail(id);
  }

  /** 검토 규칙(출처 2곳, 충돌 없음)은 case-import의 reviewCase를 그대로 씀 */
  async review(id: string, status: CaseReviewStatus, note: string | undefined) {
    const found = await this.findOrThrow(id);
    await asBadRequest(() => reviewCase(this.repo.prisma, found.slug, status, note));
    return this.detail(id);
  }

  async publish(id: string, published: boolean) {
    const found = await this.findOrThrow(id);
    await asBadRequest(() => setPublished(this.repo.prisma, found.slug, published));
    if (published && !found.isPublished) {
      const draft = newCaseDraft(found.title);
      await this.repo.createCaseUpdateDraft(id, draft.title, draft.body);
    }
    return this.detail(id);
  }

  /**
   * 사건과 딸린 타임라인·출처·가해자·질문 등을 함께 지움 (DB onDelete: Cascade).
   * 연결된 기사·브리핑 글·실종자 기록은 남고 사건 연결만 끊김 (SetNull).
   * 공개 사건은 이용자 글이 달려 있을 수 있어 비공개로 바꾼 뒤에만 지울 수 있음
   */
  async remove(id: string) {
    const found = await this.findOrThrow(id);
    if (found.isPublished) {
      throw new BadRequestException('공개 중인 사건은 먼저 비공개로 바꾼 뒤 삭제할 수 있습니다.');
    }
    await this.repo.remove(id);
    return { id, slug: found.slug, deleted: true };
  }

  /**
   * 출처 한 곳 추가. 같은 URL이 이미 있으면 막음.
   * JSON 가져오기와 같게, 출처가 바뀌면 이전 검토 결과는 무효라 초안이 아니면 '재확인 필요'로 돌림
   */
  async addSource(id: string, source: SourceAdd) {
    await this.findOrThrow(id);
    if (await this.repo.findSourceByUrl(id, source.url)) {
      throw new BadRequestException('이미 등록된 출처입니다.');
    }
    await this.repo.addSource(id, source);
    return this.detail(id);
  }

  async removeSource(id: string, sourceId: string) {
    await this.findOrThrow(id);
    const removed = await this.repo.removeSource(id, sourceId);
    if (!removed) throw new NotFoundException('출처를 찾을 수 없습니다.');
    return this.detail(id);
  }

  /** 관련 콘텐츠(다큐·방송·유튜브 등) 추가. 같은 주소가 이미 있으면 막음 */
  async addRelated(id: string, item: RelatedAdd) {
    await this.findOrThrow(id);
    if (await this.repo.findRelatedByUrl(id, item.url)) {
      throw new BadRequestException('이미 등록된 관련 콘텐츠입니다.');
    }
    await this.repo.addRelated(id, item);
    return this.detail(id);
  }

  async updateRelated(id: string, relatedId: string, item: RelatedAdd) {
    await this.findOrThrow(id);
    const same = await this.repo.findRelatedByUrl(id, item.url);
    if (same && same.id !== relatedId) throw new BadRequestException('이미 등록된 관련 콘텐츠 주소입니다.');
    const updated = await this.repo.updateRelated(id, relatedId, item);
    if (!updated) throw new NotFoundException('관련 콘텐츠를 찾을 수 없습니다.');
    return this.detail(id);
  }

  async removeRelated(id: string, relatedId: string) {
    await this.findOrThrow(id);
    const removed = await this.repo.removeRelated(id, relatedId);
    if (!removed) throw new NotFoundException('관련 콘텐츠를 찾을 수 없습니다.');
    return this.detail(id);
  }
}
