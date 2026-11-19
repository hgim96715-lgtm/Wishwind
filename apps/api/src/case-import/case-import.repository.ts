/**
 * 사건 JSON import의 DB 저장 함수 모음 (repository).
 * CLI(`pnpm cases ...`)와 Nest(관리실·inbox)가 같이 쓰므로 클래스 대신 PrismaClient를 받는 함수로 둠
 */
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import {
  CaseReviewStatus,
  ClaimStatus,
} from '../generated/prisma/enums.js';
import {
  isClueOnlySource,
  type ImportContent,
  type ImportEntry,
} from './case-import.schema.js';

const asDate = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00Z`) : null;
// 타임라인은 timestamptz라 한국 날짜가 밀리지 않도록 정오로 저장함
const asTimelineDate = (value: string | null | undefined) =>
  value ? new Date(`${value}T12:00:00+09:00`) : null;

export interface ImportResult {
  slug: string;
  action: 'created' | 'updated' | 'sources-only';
  sources: number;
  claims: number;
}

function caseData(content: ImportContent) {
  return {
    title: content.title,
    summary: content.summary,
    overview: content.overview ?? null,
    victimCountNote: content.victimCountNote ?? null,
    country: content.country,
    category: content.category,
    status: content.status,
    location: content.location ?? null,
    occurredAt: asDate(content.occurredAt),
    occurredAtPrecision: content.occurredAtPrecision,
    solvedAt: asDate(content.solvedAt),
  };
}

async function replaceDetails(
  tx: Prisma.TransactionClient,
  caseId: string,
  content: ImportContent,
) {
  await tx.timelineEvent.deleteMany({ where: { caseId } });
  await tx.victim.deleteMany({ where: { caseId } });
  await tx.unsolvedQuestion.deleteMany({ where: { caseId } });
  await tx.suspiciousCircumstance.deleteMany({ where: { caseId } });

  await tx.timelineEvent.createMany({
    data: content.timeline.map((t, sortOrder) => ({
      caseId,
      occurredAt: asTimelineDate(t.occurredAt),
      occurredAtPrecision: t.occurredAtPrecision,
      title: t.title,
      description: t.description ?? null,
      sortOrder,
    })),
  });
  await tx.victim.createMany({
    data: content.victims.map((v, sortOrder) => ({
      caseId,
      name: v.name ?? null,
      alias: v.alias ?? null,
      age: v.age ?? null,
      gender: v.gender,
      description: v.description ?? null,
      status: v.status,
      sortOrder,
    })),
  });
  await tx.unsolvedQuestion.createMany({
    data: content.questions.map((q, sortOrder) => ({
      caseId,
      question: q.question,
      description: q.description ?? null,
      isResolved: q.isResolved,
      answer: q.answer ?? null,
      sortOrder,
    })),
  });
  await tx.suspiciousCircumstance.createMany({
    data: content.circumstances.map((c, sortOrder) => ({
      caseId,
      title: c.title,
      description: c.description ?? null,
      sortOrder,
    })),
  });
}

/**
 * 투표가 판결 id에 묶여 있으므로 가해자는 이름(없으면 별칭), 판결은 심급으로 맞춰 id를 유지함.
 * 투표가 있는 판결을 지우게 되는 입력은 가져오기 전체를 중단함.
 */
async function syncSuspects(
  tx: Prisma.TransactionClient,
  caseId: string,
  slug: string,
  content: ImportContent,
) {
  const existing = await tx.suspect.findMany({
    where: { caseId },
    include: {
      sentences: { include: { _count: { select: { votes: true } } } },
    },
  });
  const byIdentity = new Map(existing.map((s) => [s.name ?? s.alias, s]));
  const kept = new Set<string>();

  for (const [sortOrder, input] of content.suspects.entries()) {
    const data = {
      name: input.name ?? null,
      alias: input.alias ?? null,
      description: input.description ?? null,
      charges: input.charges ?? null,
      status: input.status,
      sortOrder,
      identityDisclosedAt: asDate(input.identityDisclosedAt),
      identityDisclosureAgency: input.identityDisclosureAgency ?? null,
      identityDisclosureSource: input.identityDisclosureSource ?? null,
      photoUrl: input.photoUrl ?? null,
      photoSourceAgency: input.photoSourceAgency ?? null,
      photoSourceUrl: input.photoSourceUrl ?? null,
      nameExceptionReason: input.nameExceptionReason ?? null,
      nameExceptionDecidedAt: asDate(input.nameExceptionDecidedAt),
    };
    const current = byIdentity.get(input.name ?? input.alias ?? null);
    const suspect = current
      ? await tx.suspect.update({ where: { id: current.id }, data })
      : await tx.suspect.create({ data: { ...data, caseId } });
    kept.add(suspect.id);

    const levels = new Set(input.sentences.map((s) => s.courtLevel));
    for (const old of current?.sentences ?? []) {
      if (levels.has(old.courtLevel)) continue;
      if (old._count.votes > 0) {
        throw new Error(
          `${slug}: 투표 ${old._count.votes}건이 있는 판결(${old.courtLevel})은 지울 수 없습니다`,
        );
      }
      await tx.sentence.delete({ where: { id: old.id } });
    }

    for (const sentence of input.sentences) {
      const sentenceData = {
        courtLevel: sentence.courtLevel,
        courtName: sentence.courtName ?? null,
        type: sentence.type,
        verdict: sentence.verdict ?? null,
        penalty: sentence.penalty ?? null,
        isFinal: sentence.isFinal,
        decidedAt: asDate(sentence.decidedAt),
      };
      const match = current?.sentences.find(
        (s) => s.courtLevel === sentence.courtLevel,
      );
      if (match) {
        await tx.sentence.update({
          where: { id: match.id },
          data: sentenceData,
        });
      } else {
        await tx.sentence.create({
          data: { ...sentenceData, suspectId: suspect.id },
        });
      }
    }
  }

  for (const old of existing) {
    if (kept.has(old.id)) continue;
    const votes = old.sentences.reduce((sum, s) => sum + s._count.votes, 0);
    if (votes > 0) {
      throw new Error(
        `${slug}: 투표 ${votes}건이 있는 가해자(${old.name ?? old.alias})는 지울 수 없습니다`,
      );
    }
    await tx.suspect.delete({ where: { id: old.id } });
  }
}

/** 출처는 누적하고, 이번 파일에 포함된 출처의 인용만 새 내용으로 교체함 */
async function syncSources(
  tx: Prisma.TransactionClient,
  caseId: string,
  entry: ImportEntry,
) {
  for (const source of entry.sources) {
    const data = {
      title: source.title,
      publisher: source.publisher,
      type: source.type,
      publishedAt: asDate(source.publishedAt),
      accessedAt: asDate(source.accessedAt),
    };
    const saved = await tx.caseSource.upsert({
      where: { caseId_url: { caseId, url: source.url } },
      create: { ...data, caseId, url: source.url },
      update: data,
    });
    await tx.caseClaim.deleteMany({ where: { sourceId: saved.id } });
    await tx.caseClaim.createMany({
      data: entry.claims
        .filter((claim) => claim.sourceUrl === source.url)
        .map((claim) => ({
          sourceId: saved.id,
          field: claim.field,
          value: claim.value,
          quote: claim.quote,
          status: claim.status,
        })),
    });
  }
}

export async function importEntry(
  tx: Prisma.TransactionClient,
  entry: ImportEntry,
): Promise<ImportResult> {
  const existing = await tx.case.findUnique({ where: { slug: entry.slug } });
  if (!existing && !entry.content) {
    throw new Error(`${entry.slug}: 새 사건에는 content가 필요합니다`);
  }

  const saved = existing
    ? entry.content
      ? await tx.case.update({
          where: { id: existing.id },
          data: caseData(entry.content),
        })
      : existing
    : await tx.case.create({
        data: { slug: entry.slug, ...caseData(entry.content!) },
      });

  if (entry.content) {
    await replaceDetails(tx, saved.id, entry.content);
    await syncSuspects(tx, saved.id, entry.slug, entry.content);
  }
  await syncSources(tx, saved.id, entry);

  // 내용이나 출처가 바뀌면 이전 검토 결과는 더 이상 유효하지 않음
  if (existing && existing.reviewStatus !== CaseReviewStatus.DRAFT) {
    await tx.case.update({
      where: { id: saved.id },
      data: {
        reviewStatus: CaseReviewStatus.NEEDS_REVIEW,
        lastVerifiedAt: null,
      },
    });
  }

  return {
    slug: entry.slug,
    action: !existing ? 'created' : entry.content ? 'updated' : 'sources-only',
    sources: entry.sources.length,
    claims: entry.claims.length,
  };
}

async function findCase(prisma: PrismaClient, slug: string) {
  const found = await prisma.case.findUnique({
    where: { slug },
    include: { sources: { include: { claims: true } } },
  });
  if (!found) throw new Error(`사건을 찾을 수 없습니다: ${slug}`);
  return found;
}

export async function reviewCase(
  prisma: PrismaClient,
  slug: string,
  status: CaseReviewStatus,
  note: string | undefined,
) {
  const found = await findCase(prisma, slug);
  if (status === CaseReviewStatus.VERIFIED) {
    const publishers = new Set(
      found.sources
        .filter((s) => !isClueOnlySource(s.url))
        .map((s) => s.publisher),
    );
    if (publishers.size < 2) {
      throw new Error(`${slug}: 검증 완료에는 서로 다른 출처 2곳 이상이 필요합니다`);
    }
    const conflicts = found.sources
      .flatMap((s) => s.claims)
      .filter((c) => c.status === ClaimStatus.CONFLICT);
    if (conflicts.length > 0) {
      throw new Error(`${slug}: 출처가 충돌하는 내용이 ${conflicts.length}건 있습니다`);
    }
  }
  return prisma.case.update({
    where: { slug },
    data: {
      reviewStatus: status,
      reviewNote: note ?? found.reviewNote,
      lastVerifiedAt:
        status === CaseReviewStatus.VERIFIED ? new Date() : found.lastVerifiedAt,
      isPublished:
        status === CaseReviewStatus.REJECTED ? false : found.isPublished,
    },
  });
}

/**
 * 사람이 검토를 끝낸 초안을 한 번에 검증 완료 + 공개로 바꿈.
 * reviewCase와 같은 규칙(서로 다른 출처 2곳, 충돌 없음)을 통과한 사건만 바꾸고, 못 바꾼 사건은 사유와 함께 돌려줌.
 * 반려(REJECTED) 사건은 건드리지 않음.
 */
export async function publishAllReviewed(prisma: PrismaClient, note?: string) {
  const targets = await prisma.case.findMany({
    where: {
      OR: [
        { reviewStatus: { in: [CaseReviewStatus.DRAFT, CaseReviewStatus.NEEDS_REVIEW] } },
        { reviewStatus: CaseReviewStatus.VERIFIED, isPublished: false },
      ],
    },
    select: { slug: true },
    orderBy: { slug: 'asc' },
  });
  const results: { slug: string; result: string }[] = [];
  for (const { slug } of targets) {
    try {
      await reviewCase(prisma, slug, CaseReviewStatus.VERIFIED, note);
      await setPublished(prisma, slug, true);
      results.push({ slug, result: '공개' });
    } catch (error) {
      results.push({ slug, result: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

/** 재확인에서 차이가 없을 때 확인일만 갱신함 */
export async function markVerified(prisma: PrismaClient, slug: string) {
  return prisma.case.update({
    where: { slug },
    data: { lastVerifiedAt: new Date() },
  });
}

export async function setPublished(
  prisma: PrismaClient,
  slug: string,
  published: boolean,
) {
  const found = await findCase(prisma, slug);
  if (published && found.reviewStatus !== CaseReviewStatus.VERIFIED) {
    throw new Error(`${slug}: 검증 완료(VERIFIED)된 사건만 공개할 수 있습니다`);
  }
  return prisma.case.update({
    where: { slug },
    data: { isPublished: published },
  });
}

export async function listReviewStatus(prisma: PrismaClient) {
  const cases = await prisma.case.findMany({
    orderBy: [{ reviewStatus: 'asc' }, { slug: 'asc' }],
    select: {
      slug: true,
      reviewStatus: true,
      isPublished: true,
      lastVerifiedAt: true,
      sources: { select: { claims: { select: { status: true } } } },
    },
  });
  return cases.map((c) => {
    const claims = c.sources.flatMap((s) => s.claims);
    return {
      slug: c.slug,
      review: c.reviewStatus,
      published: c.isPublished,
      sources: c.sources.length,
      claims: claims.length,
      conflicts: claims.filter((x) => x.status === ClaimStatus.CONFLICT).length,
      verifiedAt: c.lastVerifiedAt?.toISOString().slice(0, 10) ?? '-',
    };
  });
}
