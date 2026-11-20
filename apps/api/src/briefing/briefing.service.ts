import { Injectable } from '@nestjs/common';
import { countRows, tallyVotes, toPublicNews, topSentenceIds, voteTotal } from './briefing.mapper.js';
import { BriefingRepository } from './briefing.repository.js';

const POSTS = 30;
const TOP = 5;
const NOTES = 3;

/** 브리핑룸에 보이는 것은 모두 공개(PUBLISHED) 데이터만 */
@Injectable()
export class BriefingService {
  constructor(private readonly repo: BriefingRepository) {}

  async overview() {
    const [notices, posts, news, recentCases, missing, stats, opinions, participation, board] = await Promise.all([
      this.repo.notices(),
      this.repo.posts(POSTS),
      this.repo.publishedNews(15),
      // 관리자가 글을 쓰지 않아도 보이도록 사건 데이터에서 바로 가져옴
      this.repo.recentCases(6),
      this.repo.recentMissing(6),
      this.caseStats(),
      this.opinionStats(),
      this.repo.participationCounts(),
      this.notesBoard(),
    ]);
    return { notices, posts, news: news.map(toPublicNews), recentCases, missing, stats, opinions, participation, board };
  }

  /** 사람들의 생각 게시판: 오늘의 질문 + 그 질문에 남긴 수사 노트(질문이 없을 때만 최근 노트) + 실종방 응원. 공개(PUBLISHED) 글만 */
  private async notesBoard() {
    const dayNumber = Math.floor((Date.now() + 9 * 3_600_000) / 86_400_000);
    const question = await this.repo.questionOfDay(dayNumber);
    const [own, cheers] = await Promise.all([
      question ? this.repo.recentAnswers(question.id, NOTES) : Promise.resolve([]),
      this.repo.recentCheers(6),
    ]);
    // 오늘의 질문이 있으면 그 질문에 남긴 노트만 보여 줌 (어제 질문의 답이 섞이지 않게).
    // 답이 아직 없으면 화면에서 '첫 생각을 남겨 주세요'로 안내함. 질문이 아예 없을 때만 최근 노트를 보여 줌
    const extra = question ? [] : await this.repo.recentAnswers(null, NOTES);
    const notes = [...own, ...extra].slice(0, NOTES).map((a) => ({
      id: a.id,
      body: a.body,
      createdAt: a.createdAt,
      question: a.question.question,
      caseSlug: a.question.case.slug,
      caseTitle: a.question.case.title,
      forToday: own.some((o) => o.id === a.id),
    }));
    return {
      question: question
        ? { id: question.id, question: question.question, caseSlug: question.case.slug, caseTitle: question.case.title }
        : null,
      notes,
      // 같은 응원 문구가 여러 번 있으면 하나만
      cheers: cheers.filter((c, i) => cheers.findIndex((x) => x.body === c.body) === i).slice(0, 2),
    };
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
