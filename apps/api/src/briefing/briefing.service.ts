import { Injectable } from '@nestjs/common';
import { countRows, tallyVotes, toPublicNews, topSentenceIds, voteTotal } from './briefing.mapper.js';
import { BriefingRepository } from './briefing.repository.js';

const POSTS = 30;
const TOP = 5;

/** 브리핑룸에 보이는 것은 모두 공개(PUBLISHED) 데이터만 */
@Injectable()
export class BriefingService {
  constructor(private readonly repo: BriefingRepository) {}

  async overview() {
    const [notices, posts, news, recentCases, missing, stats, opinions, participation] = await Promise.all([
      this.repo.notices(),
      this.repo.posts(POSTS),
      this.repo.publishedNews(15),
      // 관리자가 글을 쓰지 않아도 보이도록 사건 데이터에서 바로 가져옴
      this.repo.recentCases(6),
      this.repo.recentMissing(6),
      this.caseStats(),
      this.opinionStats(),
      this.repo.participationCounts(),
    ]);
    return { notices, posts, news: news.map(toPublicNews), recentCases, missing, stats, opinions, participation };
  }

  private async caseStats() {
    const [total, byCategory, byStatus, byCountry] = await this.repo.caseCounts();
    return {
      total,
      byCategory: countRows(byCategory, 'category'),
      byStatus: countRows(byStatus, 'status'),
      byCountry: countRows(byCountry, 'country'),
    };
  }

  private async opinionStats() {
    const tally = tallyVotes(await this.repo.groupVotes());
    const [sentences, curious, answered] = await Promise.all([
      this.repo.finalSentencesOfPublishedCases(topSentenceIds(tally, TOP * 2)),
      this.repo.mostCuriousQuestions(TOP),
      this.repo.answerCountsByQuestion(TOP * 2),
    ]);
    const sentenceVotes = sentences
      .map((s) => ({
        sentenceId: s.id,
        penalty: s.penalty ?? s.type,
        caseSlug: s.suspect.case.slug,
        caseTitle: s.suspect.case.title,
        ...tally.get(s.id)!,
      }))
      .sort((a, b) => voteTotal(b) - voteTotal(a))
      .slice(0, TOP);

    const questions = await this.repo.questionsOfPublishedCases(answered.map((a) => a.questionId));
    const mostAnswered = answered
      .flatMap((a) => {
        const q = questions.find((x) => x.id === a.questionId);
        return q
          ? [{ id: q.id, question: q.question, answers: a._count, caseSlug: q.case.slug, caseTitle: q.case.title }]
          : [];
      })
      .slice(0, TOP);

    return { sentenceVotes, curious, mostAnswered };
  }
}
