import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseStatus, UserContentStatus } from '../generated/prisma/enums.js';
import { assertNotBlocked } from '../common/voter/blocked-voter.js';
import { CaseNotesRepository } from './case-notes.repository.js';
import { moderationContext, toNotesView, UNLOCKING } from './case-notes.mapper.js';
import { ContentModerator, type ModerationResult } from './content-moderator.js';
import type { ReportTarget } from './dto/case-notes.dto.js';

const DAILY_LIMIT = 10;
const HIDE_AFTER_REPORTS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ANSWERS = 300;
const MAX_QUESTIONS = 50;

@Injectable()
export class CaseNotesService {
  constructor(
    private readonly repo: CaseNotesRepository,
    private readonly moderator: ContentModerator,
  ) {}

  private async loadCase(slug: string) {
    const found = await this.repo.findPublishedCase(slug);
    if (!found) throw new NotFoundException(`사건을 찾을 수 없습니다: ${slug}`);
    return found;
  }

  /** 차단된 브라우저인지, 하루 글 수(답변+질문)를 넘었는지 확인 */
  private async assertCanWrite(voterId: string) {
    await assertNotBlocked(this.repo.prisma, voterId);
    const written = await this.repo.countRecentWrites(voterId, new Date(Date.now() - DAY_MS));
    if (written >= DAILY_LIMIT) {
      throw new HttpException(
        '오늘은 더 남길 수 없습니다. 내일 다시 시도해 주세요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * 다른 사람 노트는 내 노트를 남기기 전에는 보이지 않고, 남기면 모두 열림
   * (남의 의견에 휩쓸리기 전에 먼저 생각해 보도록).
   * 1차: 내 글·답변 수·사용자 질문 / 2차: 답변·내가 누른 "궁금"·"공감" — 각 단계는 병렬 조회
   */
  async getNotes(slug: string, voterId: string | undefined) {
    const found = await this.loadCase(slug);
    const questionIds = found.unsolvedQuestions.map((q) => q.id);

    const [mine, counts, userQuestions, myQuestion] = await Promise.all([
      voterId ? this.repo.findMyAnswers(voterId, questionIds) : [],
      this.repo.countPublishedAnswers(questionIds),
      this.repo.findPublishedUserQuestions(found.id, MAX_QUESTIONS),
      voterId ? this.repo.findMyQuestion(found.id, voterId) : null,
    ]);

    const unlocked = mine
      .filter((a) => UNLOCKING.includes(a.status))
      .map((a) => a.questionId);
    const [answers, curious] = await Promise.all([
      questionIds.length > 0 ? this.repo.findPublishedAnswers(questionIds, MAX_ANSWERS) : [],
      voterId && userQuestions.length > 0
        ? this.repo.findMyCurious(voterId, userQuestions.map((q) => q.id))
        : [],
    ]);
    const empathies =
      voterId && answers.length > 0
        ? await this.repo.findMyEmpathies(voterId, answers.map((a) => a.id))
        : [];

    return toNotesView({
      found,
      voterId,
      mine,
      counts,
      userQuestions,
      myQuestion,
      unlocked,
      answers,
      curiousIds: new Set(curious.map((c) => c.userQuestionId)),
      empathyIds: new Set(empathies.map((e) => e.answerId)),
    });
  }

  private async afterSave(slug: string, voterId: string, result: ModerationResult) {
    return {
      result: { status: result.status, message: result.message },
      notes: await this.getNotes(slug, voterId),
    };
  }

  async saveAnswer(slug: string, questionId: string, voterId: string, body: string) {
    const found = await this.loadCase(slug);
    if (!found.unsolvedQuestions.some((q) => q.id === questionId)) {
      throw new NotFoundException('질문을 찾을 수 없습니다');
    }
    const existing = await this.repo.findAnswerStatus(questionId, voterId);
    if (existing?.status === UserContentStatus.HIDDEN) {
      throw new ConflictException('신고로 숨겨진 글은 고칠 수 없습니다.');
    }
    await this.assertCanWrite(voterId);

    const result = await this.moderator.moderate(body, moderationContext(found));
    await this.repo.upsertAnswer(questionId, voterId, result);
    return this.afterSave(slug, voterId, result);
  }

  /**
   * 내 노트 지우기. 받은 공감·신고 기록도 함께 지워지고, 그 질문은 다시 잠김(다른 사람 노트가 안 보임).
   * 신고로 숨겨진 글은 고치기와 같게 지울 수 없음 (신고 기록을 지우고 다시 쓰는 것을 막음)
   */
  async deleteAnswer(slug: string, questionId: string, voterId: string) {
    const found = await this.loadCase(slug);
    if (!found.unsolvedQuestions.some((q) => q.id === questionId)) {
      throw new NotFoundException('질문을 찾을 수 없습니다');
    }
    const existing = await this.repo.findAnswerStatus(questionId, voterId);
    if (!existing) throw new NotFoundException('지울 노트가 없습니다');
    if (existing.status === UserContentStatus.HIDDEN) {
      throw new ConflictException('신고로 숨겨진 글은 지울 수 없습니다.');
    }
    await this.repo.deleteAnswer(questionId, voterId);
    return this.getNotes(slug, voterId);
  }

  async saveQuestion(slug: string, voterId: string, body: string) {
    const found = await this.loadCase(slug);
    if (found.status !== CaseStatus.UNSOLVED) {
      throw new ConflictException('미제 사건에서만 질문을 추가할 수 있습니다.');
    }
    const existing = await this.repo.findQuestionStatus(found.id, voterId);
    if (
      existing?.status === UserContentStatus.PUBLISHED ||
      existing?.status === UserContentStatus.HIDDEN
    ) {
      throw new ConflictException('질문은 사건마다 하나만 남길 수 있습니다.');
    }
    await this.assertCanWrite(voterId);

    const result = await this.moderator.moderate(body, moderationContext(found));
    await this.repo.upsertQuestion(found.id, voterId, result);
    return this.afterSave(slug, voterId, result);
  }

  async markCurious(slug: string, id: string, voterId: string) {
    const found = await this.loadCase(slug);
    const question = await this.repo.findPublishedUserQuestion(id, found.id);
    if (!question) throw new NotFoundException('질문을 찾을 수 없습니다');
    await this.repo.addCurious(id, voterId);
    return this.getNotes(slug, voterId);
  }

  /** '공감해요'. 내 노트에는 누를 수 없음 */
  async markEmpathy(slug: string, answerId: string, voterId: string) {
    const found = await this.loadCase(slug);
    const answer = await this.repo.findPublishedAnswer(answerId, found.id);
    if (!answer) throw new NotFoundException('노트를 찾을 수 없습니다');
    if (answer.voterId === voterId) throw new ConflictException('내 노트에는 공감을 누를 수 없습니다.');
    await this.repo.addEmpathy(answerId, voterId);
    return this.getNotes(slug, voterId);
  }

  async report(
    slug: string,
    target: ReportTarget,
    id: string,
    voterId: string,
    reason: string | undefined,
  ) {
    const found = await this.loadCase(slug);
    const visible = await this.repo.findReportable(target, id, found.id);
    if (!visible) throw new NotFoundException('글을 찾을 수 없습니다');
    await this.repo.addReport(target, id, voterId, reason, HIDE_AFTER_REPORTS);
    return { message: '신고를 접수했습니다.' };
  }
}
