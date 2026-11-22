import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Button } from "@/components/admin/ActionForm";
import { Badge, Card, ErrorBox, Field, Skeleton, inputClass } from "@/components/admin/ui";
import { addCaseChange, addCaseRelated, addCaseSource, deleteCase, publishCase, removeCaseChange, removeCaseRelated, removeCaseSource, reviewCase, updateCase, updateCaseChange, updateCaseRelated } from "@/app/admin/actions";
import {
  BRIEFING_KIND_LABEL,
  BRIEFING_STATUS_LABEL,
  REVIEW_COLOR,
  REVIEW_LABEL,
  formatDateTime,
} from "@/lib/admin/labels";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { AdminCaseDetail, ReviewStatus } from "@/lib/admin/types";
import type { CaseChange, RelatedContent } from "@/lib/cases/types";
import { CATEGORY_LABEL, COUNTRY_LABEL, COUNTRY_ORDER, STATUS_STAMP, caseRoomCountry } from "@/lib/cases/labels";

const PRECISION = { DAY: "일까지", MONTH: "월까지", YEAR: "연도만", UNKNOWN: "모름" } as const;
const REVIEWS: ReviewStatus[] = ["DRAFT", "NEEDS_REVIEW", "VERIFIED", "REJECTED"];
const dateValue = (iso: string | null) => iso?.slice(0, 10) ?? "";

const CHANGE_KIND: Record<string, string> = { LAW: "법", SYSTEM: "제도", DAY: "기념일" };

/** '바뀐 것' 추가·고치기 칸. item이 있으면 그 값으로 채움 */
function ChangeFields({ item }: { item?: CaseChange }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="종류">
          <select name="kind" defaultValue={item?.kind ?? "LAW"} className={inputClass}>
            {Object.entries(CHANGE_KIND).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="생긴 해">
          <input name="year" type="number" min={1800} max={2100} defaultValue={item?.year ?? ""} className={inputClass} />
        </Field>
        <Field label="나라">
          <select name="country" defaultValue={item?.country ?? ""} className={inputClass}>
            <option value="">사건과 같음</option>
            {COUNTRY_ORDER.map((k) => (
              <option key={k} value={k}>{COUNTRY_LABEL[k]}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="이름" hint="예: 애덤월시법 (Adam Walsh Act), 여성 폭력 추모·행동의 날 (12월 6일)">
        <input name="name" required maxLength={200} defaultValue={item?.name} className={inputClass} />
      </Field>
      <Field label="기념일이면 매년 돌아오는 날" hint="MM-DD 형식 (예: 12-06). 법·제도는 비워 두세요.">
        <input name="observedOn" pattern="(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])" placeholder="12-06" defaultValue={item?.observedOn ?? ""} className={inputClass} />
      </Field>
      <Field label="한두 문장 설명 (합니다체)">
        <textarea name="description" required maxLength={500} rows={3} defaultValue={item?.description} className={inputClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="출처 주소" hint="법령·정부·언론 원문. 위키는 안 됩니다.">
          <input name="sourceUrl" type="url" required maxLength={1000} defaultValue={item?.sourceUrl} placeholder="https://" className={inputClass} />
        </Field>
        <Field label="출처 제목">
          <input name="sourceTitle" required maxLength={300} defaultValue={item?.sourceTitle} className={inputClass} />
        </Field>
      </div>
    </>
  );
}

/** 관련 콘텐츠 종류 (사건 페이지의 '더 보기' 묶음과 같은 이름) */
const RELATED_KIND_LABEL: Record<string, string> = {
  DOCUMENTARY: "다큐멘터리",
  TV_PROGRAM: "방송",
  YOUTUBE: "유튜브",
  PODCAST: "팟캐스트",
  MOVIE: "영화",
  SERIES: "시리즈",
  BOOK: "책",
};

/** 관련 콘텐츠 추가·고치기에 같이 쓰는 입력 칸. item이 있으면 그 값으로 채움 */
function RelatedFields({ item }: { item?: RelatedContent }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="종류">
          <select name="kind" defaultValue={item?.kind ?? "TV_PROGRAM"} className={inputClass}>
            {Object.entries(RELATED_KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="방송사·채널·플랫폼">
          <input name="platform" required maxLength={100} defaultValue={item?.platform} placeholder="예: SBS, 넷플릭스, 유튜브" className={inputClass} />
        </Field>
      </div>
      <Field label="제목" hint="예: 그것이 알고 싶다 1234회 ‘…’">
        <input name="title" required maxLength={300} defaultValue={item?.title} className={inputClass} />
      </Field>
      <Field label="주소(URL)" hint="https 주소만 됩니다. 위키는 넣지 않습니다.">
        <input name="url" type="url" required maxLength={1000} defaultValue={item?.url} placeholder="https://" className={inputClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="만든 사람" hint="비워도 됩니다.">
          <input name="creator" maxLength={200} defaultValue={item?.creator ?? ""} className={inputClass} />
        </Field>
        <Field label="공개 연도">
          <input name="releaseYear" type="number" min={1900} max={2100} defaultValue={item?.releaseYear ?? ""} className={inputClass} />
        </Field>
        <Field label="언어">
          <select name="language" defaultValue={item?.language ?? "ko"} className={inputClass}>
            <option value="ko">한국어</option>
            <option value="en">영어</option>
            <option value="ja">일본어</option>
            <option value="zh">중국어</option>
          </select>
        </Field>
      </div>
      <Field label="메모" hint="각색 작품이면 ‘사건을 모티브로 한 극영화’처럼 꼭 적어 주세요.">
        <input name="note" maxLength={300} defaultValue={item?.note ?? ""} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDramatized" defaultChecked={item?.isDramatized ?? false} />
        각색 작품입니다 (영화·드라마처럼 사실과 다를 수 있음)
      </label>
    </>
  );
}

const SOURCE_TYPE_LABEL: Record<string, string> = {
  NEWS: "언론 기사",
  NEWS_AGENCY: "통신사",
  BROADCAST: "방송",
  GOVERNMENT: "정부·수사기관",
  COURT: "법원",
  OTHER: "기타",
};

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
          사건 목록
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
                {/* 사건방처럼 중국은 기타로 묶음. 예전 중국(CN) 사건은 기타로 보이고, 저장하면 기타로 바뀜 */}
                <select name="country" defaultValue={caseRoomCountry(c.country)} className={inputClass}>
                  {COUNTRY_ORDER.map((k) => (
                    <option key={k} value={k}>{COUNTRY_LABEL[k]}</option>
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
            <div className="mt-4 border-t border-line pt-4">
              {c.isPublished ? (
                <p className="text-xs text-subtle">공개 중인 사건은 비공개로 바꾼 뒤 삭제할 수 있습니다.</p>
              ) : (
                <ActionForm
                  action={deleteCase.bind(null, c.id)}
                  confirmMessage="이 사건을 삭제할까요? 타임라인·출처·가해자·질문도 함께 지워지며 되돌릴 수 없습니다."
                >
                  <Button tone="danger">사건 삭제</Button>
                  <p className="text-xs text-subtle">사건방에 넣지 않을 초안만 지워 주세요. 연결된 기사는 남고 사건 연결만 끊깁니다.</p>
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
                <li key={s.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a href={s.url} target="_blank" rel="noreferrer noopener" className="break-words transition-opacity hover:opacity-70">
                      {s.title}
                    </a>
                    <p className="text-xs text-subtle">
                      {s.publisher} · {SOURCE_TYPE_LABEL[s.type] ?? s.type}
                      {s.publishedAt && ` · ${s.publishedAt.slice(0, 10)}`} · 인용 {s._count.claims}
                    </p>
                  </div>
                  <ActionForm
                    inline
                    action={removeCaseSource.bind(null, c.id, s.id)}
                    confirmMessage={`이 출처를 지울까요?\n${s.title}`}
                  >
                    <button type="submit" className="shrink-0 text-xs text-subtle hover:text-[#b5543a]" aria-label="출처 지우기">
                      지우기
                    </button>
                  </ActionForm>
                </li>
              ))}
            </ul>
            <details className="mt-4 border-t border-line pt-4">
              <summary className="cursor-pointer text-sm font-medium">출처 추가</summary>
              <ActionForm action={addCaseSource.bind(null, c.id)} className="mt-3">
                <Field label="주소(URL)">
                  <input name="url" type="url" required maxLength={1000} placeholder="https://" className={inputClass} />
                </Field>
                <Field label="기사·문서 제목">
                  <input name="title" required maxLength={300} className={inputClass} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="매체·기관">
                    <input name="publisher" required maxLength={200} placeholder="예: 경향신문" className={inputClass} />
                  </Field>
                  <Field label="종류">
                    <select name="type" defaultValue="NEWS" className={inputClass}>
                      {Object.entries(SOURCE_TYPE_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="발행일" hint="모르면 비워 두세요.">
                  <input name="publishedAt" type="date" className={inputClass} />
                </Field>
                <Button tone="primary">출처 추가</Button>
                <p className="text-xs text-subtle">나무위키는 단서용이라 검증 출처 2곳에 세지 않습니다. 출처를 바꾸면 검토 상태를 다시 확인해야 합니다.</p>
              </ActionForm>
            </details>
          </Card>

          <Card>
            <h2 className="mb-1 text-sm font-semibold">이 사건 뒤에 바뀐 것 {c.changes.length}개</h2>
            <p className="mb-3 text-xs text-subtle">사건을 계기로 생긴 법·기념일·제도입니다. 사건 페이지, 홈 ‘알고 계셨나요?’, ‘사건이 바꾼 것들’ 페이지에 나옵니다.</p>
            <ul className="space-y-3 text-sm">
              {c.changes.map((ch) => (
                <li key={ch.id} className="border-b border-line pb-3 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{ch.name}</p>
                      <p className="text-xs text-subtle">
                        {CHANGE_KIND[ch.kind]}
                        {ch.year && ` · ${ch.year}년`}
                        {ch.observedOn && ` · 매년 ${ch.observedOn}`}
                      </p>
                    </div>
                    <ActionForm inline action={removeCaseChange.bind(null, c.id, ch.id)} confirmMessage={`이 항목을 지울까요?\n${ch.name}`}>
                      <button type="submit" className="shrink-0 text-xs text-subtle hover:text-[#b5543a]" aria-label="바뀐 것 지우기">
                        지우기
                      </button>
                    </ActionForm>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted">고치기</summary>
                    <ActionForm action={updateCaseChange.bind(null, c.id, ch.id)} className="mt-3">
                      <ChangeFields item={ch} />
                      <Button tone="primary">저장</Button>
                    </ActionForm>
                  </details>
                </li>
              ))}
            </ul>
            <details className="mt-4 border-t border-line pt-4">
              <summary className="cursor-pointer text-sm font-medium">바뀐 것 추가</summary>
              <ActionForm action={addCaseChange.bind(null, c.id)} className="mt-3">
                <ChangeFields />
                <Button tone="primary">추가</Button>
              </ActionForm>
            </details>
          </Card>

          <Card>
            <h2 className="mb-1 text-sm font-semibold">관련 콘텐츠 {c.relatedContents.length}개</h2>
            <p className="mb-3 text-xs text-subtle">방송·다큐·유튜브·영화처럼 사건 페이지의 ‘더 보기’에 나오는 링크입니다. 검토 상태에는 영향이 없습니다.</p>
            <ul className="space-y-3 text-sm">
              {c.relatedContents.map((r) => (
                <li key={r.id} className="border-b border-line pb-3 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <a href={r.url} target="_blank" rel="noreferrer noopener" className="break-words transition-opacity hover:opacity-70">
                        {r.title}
                      </a>
                      <p className="text-xs text-subtle">
                        {RELATED_KIND_LABEL[r.kind] ?? r.kind} · {r.platform}
                        {r.releaseYear && ` · ${r.releaseYear}`}
                        {r.isDramatized && " · 각색"}
                      </p>
                    </div>
                    <ActionForm
                      inline
                      action={removeCaseRelated.bind(null, c.id, r.id)}
                      confirmMessage={`이 관련 콘텐츠를 지울까요?\n${r.title}`}
                    >
                      <button type="submit" className="shrink-0 text-xs text-subtle hover:text-[#b5543a]" aria-label="관련 콘텐츠 지우기">
                        지우기
                      </button>
                    </ActionForm>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted">고치기</summary>
                    <ActionForm action={updateCaseRelated.bind(null, c.id, r.id)} className="mt-3">
                      <RelatedFields item={r} />
                      <Button tone="primary">저장</Button>
                    </ActionForm>
                  </details>
                </li>
              ))}
            </ul>
            <details className="mt-4 border-t border-line pt-4">
              <summary className="cursor-pointer text-sm font-medium">관련 콘텐츠 추가</summary>
              <ActionForm action={addCaseRelated.bind(null, c.id)} className="mt-3">
                <RelatedFields />
                <Button tone="primary">관련 콘텐츠 추가</Button>
              </ActionForm>
            </details>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">이 사건의 브리핑 글</h2>
            {c.briefingPosts.length === 0 ? (
              <p className="text-xs text-subtle">아직 없습니다.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {c.briefingPosts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/briefing/${p.id}`} className="transition-opacity hover:opacity-70">
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
