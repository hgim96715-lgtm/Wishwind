import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Button } from "@/components/admin/ActionForm";
import { Badge, Card, ErrorBox, Field, Skeleton, inputClass } from "@/components/admin/ui";
import { publishCase, reviewCase, updateCase } from "@/app/admin/actions";
import {
  BRIEFING_KIND_LABEL,
  BRIEFING_STATUS_LABEL,
  REVIEW_COLOR,
  REVIEW_LABEL,
  formatDateTime,
} from "@/lib/admin/labels";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { AdminCaseDetail, ReviewStatus } from "@/lib/admin/types";
import { CATEGORY_LABEL, COUNTRY_LABEL, STATUS_STAMP } from "@/lib/cases/labels";

const PRECISION = { DAY: "일까지", MONTH: "월까지", YEAR: "연도만", UNKNOWN: "모름" } as const;
const REVIEWS: ReviewStatus[] = ["DRAFT", "NEEDS_REVIEW", "VERIFIED", "REJECTED"];
const dateValue = (iso: string | null) => iso?.slice(0, 10) ?? "";

export default function AdminCaseDetailPage({ params }: PageProps<"/admin/cases/[id]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      {params.then(({ id }) => (
        <CaseEditor id={id} />
      ))}
    </Suspense>
  );
}

async function CaseEditor({ id }: { id: string }) {
  let c: AdminCaseDetail;
  try {
    c = await adminGet<AdminCaseDetail>(`/cases/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  const publishers = new Set(c.sources.map((s) => s.publisher)).size;

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/cases" className="text-sm text-subtle hover:text-foreground">
          ← 사건 목록
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{c.title}</h1>
          <Badge color={REVIEW_COLOR[c.reviewStatus]}>{REVIEW_LABEL[c.reviewStatus]}</Badge>
          <Badge color={c.isPublished ? "#3f8f84" : "#9a9389"}>{c.isPublished ? "공개 중" : "비공개"}</Badge>
        </div>
        <p className="mt-1 text-xs text-subtle">
          {c.slug} · 마지막 확인 {formatDateTime(c.lastVerifiedAt)} · 수정 {formatDateTime(c.updatedAt)}
          {c.isPublished && (
            <>
              {" · "}
              <Link href={`/cases/${c.slug}`} className="underline">
                사이트에서 보기
              </Link>
            </>
          )}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="mb-4 text-sm font-semibold">기본 정보 고치기</h2>
          <ActionForm action={updateCase.bind(null, c.id)}>
            <Field label="제목">
              <input name="title" defaultValue={c.title} required maxLength={200} className={inputClass} />
            </Field>
            <Field label="요약" hint="목록과 카드에 보이는 한두 문장입니다. ~습니다 말투로 씁니다.">
              <textarea name="summary" defaultValue={c.summary} required maxLength={500} rows={3} className={inputClass} />
            </Field>
            <Field label="개요">
              <textarea name="overview" defaultValue={c.overview ?? ""} rows={10} className={inputClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="나라">
                <select name="country" defaultValue={c.country} className={inputClass}>
                  {Object.entries(COUNTRY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="유형">
                <select name="category" defaultValue={c.category} className={inputClass}>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="사건 상태" hint="공개 사건의 상태를 바꾸면 브리핑 초안이 생깁니다.">
                <select name="status" defaultValue={c.status} className={inputClass}>
                  {Object.entries(STATUS_STAMP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="발생일">
                <input type="date" name="occurredAt" defaultValue={dateValue(c.occurredAt)} className={inputClass} />
              </Field>
              <Field label="발생일 정확도">
                <select name="occurredAtPrecision" defaultValue={c.occurredAtPrecision} className={inputClass}>
                  {Object.entries(PRECISION).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="해결일">
                <input type="date" name="solvedAt" defaultValue={dateValue(c.solvedAt)} className={inputClass} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="장소">
                <input name="location" defaultValue={c.location ?? ""} maxLength={200} className={inputClass} />
              </Field>
              <Field label="피해자 수 메모" hint="예: 확인 불가">
                <input name="victimCountNote" defaultValue={c.victimCountNote ?? ""} maxLength={100} className={inputClass} />
              </Field>
            </div>
            <Button tone="primary">저장</Button>
          </ActionForm>
          <p className="mt-4 text-xs text-subtle">
            타임라인 {c._count.timeline} · 가해자 {c._count.suspects} · 피해자 {c._count.victims} · 생각해볼 점{" "}
            {c._count.unsolvedQuestions} · 의심 정황 {c._count.suspiciousCircumstances}건은 지금처럼 JSON 가져오기(pnpm cases import)로 고칩니다.
          </p>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold">검토</h2>
            <ActionForm action={reviewCase.bind(null, c.id)}>
              <Field label="검토 상태">
                <select name="status" defaultValue={c.reviewStatus} className={inputClass}>
                  {REVIEWS.map((r) => (
                    <option key={r} value={r}>{REVIEW_LABEL[r]}</option>
                  ))}
                </select>
              </Field>
              <Field label="검토 메모">
                <textarea name="note" defaultValue={c.reviewNote ?? ""} rows={3} className={inputClass} />
              </Field>
              <Button tone="primary">검토 상태 저장</Button>
            </ActionForm>
            <div className="mt-4 border-t border-line pt-4">
              {c.isPublished ? (
                <ActionForm action={publishCase.bind(null, c.id, false)} confirmMessage="이 사건을 비공개로 바꿀까요?">
                  <Button tone="danger">비공개로 바꾸기</Button>
                </ActionForm>
              ) : (
                <ActionForm action={publishCase.bind(null, c.id, true)}>
                  <Button tone="ok">공개하기</Button>
                  <p className="text-xs text-subtle">검증 완료 상태여야 공개할 수 있습니다.</p>
                </ActionForm>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="mb-1 text-sm font-semibold">출처 {c.sources.length}개</h2>
            <p className={`mb-3 text-xs ${publishers < 2 ? "text-[#b5543a]" : "text-subtle"}`}>
              서로 다른 출처 {publishers}곳 {publishers < 2 && "· 검증 완료에는 2곳 이상 필요합니다"}
            </p>
            <ul className="space-y-2 text-sm">
              {c.sources.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer noopener" className="hover:underline">
                    {s.title}
                  </a>
                  <p className="text-xs text-subtle">
                    {s.publisher} · 인용 {s._count.claims}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">이 사건의 브리핑 글</h2>
            {c.briefingPosts.length === 0 ? (
              <p className="text-xs text-subtle">아직 없습니다.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {c.briefingPosts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/briefing/${p.id}`} className="hover:underline">
                      {p.title}
                    </Link>
                    <p className="text-xs text-subtle">
                      {BRIEFING_KIND_LABEL[p.kind]} · {BRIEFING_STATUS_LABEL[p.status]}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/admin/briefing/new?caseId=${c.id}`} className="mt-3 inline-block text-sm underline">
              브리핑 글 쓰기
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
