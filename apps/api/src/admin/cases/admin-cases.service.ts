import { Injectable, NotFoundException } from '@nestjs/common';
import { reviewCase, setPublished } from '../../case-import/case-import.repository.js';
import { asBadRequest } from '../../common/errors/as-bad-request.js';
import type { CaseReviewStatus } from '../../generated/prisma/enums.js';
import type { CaseEdit, CaseListQuery } from './dto/admin-cases.dto.js';
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
}
