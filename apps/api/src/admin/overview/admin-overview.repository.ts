import { Injectable } from '@nestjs/common';
import { AUTO_IMPORT_NOTE } from '../../case-import/inbox/inbox-import.service.js';
import {
  BriefingStatus,
  CaseReviewStatus,
  InquiryKind,
  InquiryStatus,
  NewsStatus,
  UserContentStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const held = { status: UserContentStatus.HELD };
const reported = { reportCount: { gt: 0 }, status: { not: UserContentStatus.BLOCKED } };

/** 관리자 첫 화면에 쓰는 개수 집계 */
@Injectable()
export class AdminOverviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  caseCounts() {
    return Promise.all([
      this.prisma.case.count({ where: { reviewStatus: CaseReviewStatus.NEEDS_REVIEW } }),
      this.prisma.case.count({ where: { reviewStatus: CaseReviewStatus.DRAFT } }),
      this.prisma.case.count({ where: { reviewStatus: CaseReviewStatus.VERIFIED, isPublished: false } }),
      this.prisma.case.count({ where: { isPublished: true } }),
      this.prisma.case.count({
        where: { reviewStatus: CaseReviewStatus.DRAFT, reviewNote: { startsWith: AUTO_IMPORT_NOTE } },
      }),
    ]).then(([needsReview, drafts, unpublishedVerified, published, autoImported]) => ({
      needsReview,
      drafts,
      unpublishedVerified,
      published,
      autoImported,
    }));
  }

  moderationCounts() {
    return Promise.all([
      this.prisma.userAnswer.count({ where: held }),
      this.prisma.userQuestion.count({ where: held }),
      this.prisma.cloudMessage.count({ where: held }),
      this.prisma.userAnswer.count({ where: reported }),
      this.prisma.userQuestion.count({ where: reported }),
      this.prisma.blockedVoter.count(),
    ]).then(([heldAnswers, heldQuestions, heldClouds, reportedAnswers, reportedQuestions, blockedVoters]) => ({
      held: heldAnswers + heldQuestions + heldClouds,
      reported: reportedAnswers + reportedQuestions,
      blockedVoters,
    }));
  }

  inquiryCounts() {
    return Promise.all([
      this.prisma.inquiry.count({ where: { kind: { not: InquiryKind.FEEDBACK }, status: InquiryStatus.OPEN } }),
      this.prisma.inquiry.count({ where: { kind: InquiryKind.FEEDBACK, status: InquiryStatus.OPEN } }),
    ]).then(([open, newFeedback]) => ({ open, newFeedback }));
  }

  briefingCounts() {
    return Promise.all([
      this.prisma.briefingPost.count({ where: { status: BriefingStatus.DRAFT } }),
      this.prisma.newsItem.count({ where: { status: NewsStatus.NEW } }),
    ]).then(([drafts, newNews]) => ({ drafts, newNews }));
  }
}
