import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ModerationStage, ModerationVerdict, UserContentStatus } from '../../generated/prisma/enums.js';
import type { ContentType, ModerationAction, ModerationListQuery } from './dto/admin-moderation.dto.js';
import { answerItem, cloudItem, questionItem, toVoterDetail } from './admin-moderation.mapper.js';
import { AdminModerationRepository } from './admin-moderation.repository.js';

const STATUS_BY_ACTION: Record<ModerationAction, UserContentStatus> = {
  publish: UserContentStatus.PUBLISHED,
  dismiss: UserContentStatus.PUBLISHED,
  hide: UserContentStatus.HIDDEN,
  block: UserContentStatus.BLOCKED,
};

@Injectable()
export class AdminModerationService {
  constructor(private readonly repo: AdminModerationRepository) {}

  async list({ filter, type }: ModerationListQuery) {
    const want = (t: ContentType) => type === 'all' || type === t;
    const [answers, questions, clouds] = await Promise.all([
      want('answer') ? this.repo.answers(filter) : [],
      want('question') ? this.repo.questions(filter) : [],
      // 바람개비(구름) 메시지에는 신고 기능이 없음
      want('cloud') && filter !== 'reported' ? this.repo.clouds(filter) : [],
    ]);
    const blocked = await this.repo.blockedAmong([
      ...answers.map((a) => a.voterId),
      ...questions.map((q) => q.voterId),
      ...clouds.map((c) => c.voterId),
    ]);
    const items = [
      ...answers.map((a) => answerItem(a, blocked)),
      ...questions.map((q) => questionItem(q, blocked)),
      ...clouds.map((c) => cloudItem(c, blocked)),
    ].sort((x, y) => y.at.getTime() - x.at.getTime());
    return { items };
  }

  async act(type: ContentType, id: string, action: ModerationAction) {
    const status = STATUS_BY_ACTION[action];
    const category = {
      publish: 'NONE',
      dismiss: 'REPORT_DISMISSED',
      hide: 'ADMIN_HIDDEN',
      block: 'ADMIN_BLOCKED',
    }[action];
    const allow = action === 'publish' || action === 'dismiss';
    const log = {
      create: {
        stage: ModerationStage.ADMIN,
        verdict: allow ? ModerationVerdict.ALLOW : ModerationVerdict.BLOCK,
        category,
      },
    };
    try {
      if (action === 'dismiss') {
        if (type === 'cloud') throw new BadRequestException('바람개비 메시지에는 신고 기능이 없습니다.');
        // 신고가 근거 없다고 판단: 신고 기록을 지우고, 신고로 숨겨졌던 글이면 다시 공개
        await this.repo.dismissReports(type, id, log);
        return { id, type, status };
      }
      if (type === 'answer') await this.repo.updateAnswer(id, { status, moderations: log });
      else if (type === 'question') await this.repo.updateQuestion(id, { status, moderations: log });
      else await this.repo.updateCloud(id, { status, ...(action !== 'publish' && { category }) });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundException('글을 찾을 수 없습니다.');
      }
      throw error;
    }
    return { id, type, status };
  }

  /** 한 사람(브라우저 익명 ID)이 남긴 모든 글. 개인정보는 없고 voterId만 있음 */
  async voter(voterId: string) {
    return toVoterDetail(voterId, await this.repo.voterActivity(voterId));
  }

  /** 참여 제한 + 이미 공개된 글은 모두 숨김. 제한을 풀어도 숨긴 글은 자동으로 되돌리지 않음 */
  async block(voterId: string, reason: string | undefined) {
    const [, a, q, c] = await this.repo.blockAndHide(voterId, reason || null);
    return { voterId, hidden: a.count + q.count + c.count };
  }

  async unblock(voterId: string) {
    await this.repo.unblock(voterId);
    return { voterId };
  }

  listBlocked() {
    return this.repo.listBlocked();
  }
}
