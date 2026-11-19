import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BriefingKind, BriefingStatus } from '../generated/prisma/enums.js';
import type { PostInput, PostListQuery, PostPatch } from './dto/briefing.dto.js';
import { tallyVotes, voteTotal } from './briefing.mapper.js';
import { BriefingRepository } from './briefing.repository.js';
import { OpinionSummarizer } from './opinion-summarizer.js';

const MIN_OPINIONS = 3;

@Injectable()
export class BriefingAdminService {
  constructor(
    private readonly repo: BriefingRepository,
    private readonly summarizer: OpinionSummarizer,
  ) {}

  list(query: PostListQuery) {
    return this.repo.listPosts(query);
  }

  async get(id: string) {
    const post = await this.repo.findPost(id);
    if (!post) throw new NotFoundException('브리핑 글을 찾을 수 없습니다.');
    return post;
  }

  create(input: PostInput) {
    return this.repo.createPost({
      ...input,
      caseId: input.caseId ?? null,
      publishedAt: input.status === BriefingStatus.PUBLISHED ? new Date() : null,
    });
  }

  async update(id: string, patch: PostPatch) {
    const before = await this.get(id);
    const publishing = patch.status === BriefingStatus.PUBLISHED && before.status !== BriefingStatus.PUBLISHED;
    return this.repo.updatePost(id, {
      ...patch,
      // 처음 공개한 시각을 유지함. 내렸다 다시 올려도 최초 공개일 기준으로 정렬
      ...(publishing && !before.publishedAt && { publishedAt: new Date() }),
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.repo.deletePost(id);
    return { id };
  }

  /** 공개된 수사 노트 + 형량 투표를 모아 AI가 초안을 씀 → 초안(DRAFT)으로만 저장 */
  async draftOpinionSummary(caseId: string) {
    const found = await this.repo.findOpinionSource(caseId);
    if (!found) throw new NotFoundException('공개된 사건만 의견을 요약할 수 있습니다.');

    const sentences = found.suspects.flatMap((s) => s.sentences);
    const tally = sentences.length ? tallyVotes(await this.repo.groupVotes(sentences.map((s) => s.id))) : new Map();
    const votes = sentences.map((s) => ({
      penalty: s.penalty ?? s.type,
      ...(tally.get(s.id) ?? { agree: 0, disagree: 0, tooLenient: 0, tooHarsh: 0 }),
    }));

    const answers = found.unsolvedQuestions
      .filter((q) => q.userAnswers.length > 0)
      .map((q) => ({ question: q.question, bodies: q.userAnswers.map((a) => a.body) }));
    const total =
      answers.reduce((n, a) => n + a.bodies.length, 0) +
      found.userQuestions.length +
      votes.reduce((n, v) => n + voteTotal(v), 0);
    if (total < MIN_OPINIONS) {
      throw new BadRequestException(
        `요약할 의견이 아직 적습니다 (${total}개). ${MIN_OPINIONS}개 이상 모이면 다시 시도해 주세요.`,
      );
    }

    const draft = await this.summarizer.summarize({
      caseTitle: found.title,
      caseSummary: found.summary,
      answers,
      userQuestions: found.userQuestions.map((q) => ({ body: q.body, curious: q.curiousCount })),
      votes,
    });
    return this.repo.createPost({
      kind: BriefingKind.OPINION,
      status: BriefingStatus.DRAFT,
      caseId: found.id,
      title: draft.title,
      body: draft.body,
    });
  }
}
