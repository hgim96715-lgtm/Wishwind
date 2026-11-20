import Image from "next/image";
import { notFound } from "next/navigation";
import { LuGavel, LuMapPin } from "react-icons/lu";
import { ApiUnavailableError, getCase } from "@/lib/cases/api";
import {
  CATEGORY_LABEL,
  COUNTRY_LABEL,
  caseRoomCountry,
  COURT_LEVEL_LABEL,
  SENTENCE_TYPE_LABEL,
  SUSPECT_STATUS_LABEL,
  VICTIM_STATUS_LABEL,
  formatCaseDate,
} from "@/lib/cases/labels";
import type { CaseDetail, Sentence, Suspect } from "@/lib/cases/types";
import { CaseNotes } from "./CaseNotes";
import { CaseTabs, type CaseTab } from "./CaseTabs";
import { Notice } from "./Notice";
import { RelatedPanel } from "./RelatedPanel";
import { SentenceVote } from "./SentenceVote";
import { ReviewStamp, StatusStamp } from "./StatusStamp";
import { FileShareBar } from "@/components/files/FileShareBar";

/** 개발 중에만 서버 실행 방법 같은 안내를 보여 줌 (배포 사이트에는 노출하지 않음) */
const IS_DEV = process.env.NODE_ENV === "development";

export async function CaseDetailView({ slug }: { slug: string }) {
  let data: CaseDetail | null;
  try {
    data = await getCase(slug);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return (
        <Notice title="수사 본부와 연결이 잠시 끊겼습니다">
          {IS_DEV ? (
            <>
              API 서버가 꺼져 있는 것 같습니다. <code>pnpm dev:api</code>로 서버를 켠 뒤 새로고침해 주세요.
            </>
          ) : (
            "잠시 후 다시 새로고침해 주세요."
          )}
        </Notice>
      );
    }
    throw error;
  }
  if (!data) notFound();

  const tabs: CaseTab[] = [
    { id: "overview", label: "개요", panel: <OverviewPanel data={data} /> },
    {
      id: "timeline",
      label: "타임라인",
      count: data.timeline.length,
      panel: <TimelinePanel data={data} />,
    },
    {
      id: "victims",
      label: "피해자",
      count: data.victimCountNote ? undefined : data.victims.length,
      panel: <VictimsPanel data={data} />,
    },
    {
      id: "suspects",
      label: "가해자",
      count: data.suspects.length,
      panel: <SuspectsPanel data={data} />,
    },
    // 해결된 사건은 의심 정황 대신 확정 형량과 투표를 보여줌
    ...(data.status === "SOLVED"
      ? [
          {
            id: "sentence",
            label: "형량",
            count: sentencedSuspects(data).length,
            panel: <SentencePanel data={data} />,
          },
        ]
      : [
          {
            id: "circumstances",
            label: "의심 정황",
            count: data.suspiciousCircumstances.length,
            panel: <CircumstancesPanel data={data} />,
          },
        ]),
    {
      id: "questions",
      label: data.status === "SOLVED" ? "생각해볼 점" : "질문",
      count: data.unsolvedQuestions.length,
      panel: <QuestionsPanel data={data} />,
    },
    {
      id: "related",
      label: "관련 콘텐츠",
      count:
        (data.relatedContents?.length ?? 0) +
        (data.newsItems?.length ?? 0) +
        (data.sources?.filter((s) => !data.newsItems?.some((n) => n.url === s.url)).length ?? 0),
      panel: <RelatedPanel data={data} />,
    },
  ];

  return (
    <article>
      <header className="pb-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-medium text-subtle">
            {COUNTRY_LABEL[caseRoomCountry(data.country)]} · {CATEGORY_LABEL[data.category]} ·{" "}
            {formatCaseDate(data.occurredAt, data.occurredAtPrecision)}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {data.reviewPending && <ReviewStamp />}
            <StatusStamp status={data.status} className="text-sm" />
          </div>
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">
          {data.title}
        </h1>
        {data.location && (
          <p className="mt-2 inline-flex items-center gap-1 text-sm text-subtle">
            <LuMapPin aria-hidden className="size-4" />
            {data.location}
          </p>
        )}
        <FileShareBar type="case" fileKey={data.slug} title={data.title} />
      </header>

      <CaseTabs tabs={tabs} />
    </article>
  );
}

// ─── 탭 패널 (서버 컴포넌트) ───

/** 판결이 있는 가해자와 대표 판결(확정 판결, 없으면 가장 최근 판결) */
function sentencedSuspects(data: CaseDetail) {
  return data.suspects.flatMap((suspect) => {
    const sentence =
      suspect.sentences.find((s) => s.isFinal) ?? suspect.sentences.at(-1);
    return sentence ? [{ suspect, sentence }] : [];
  });
}

function SentenceList({ sentences }: { sentences: Sentence[] }) {
  return (
    <ul className="space-y-2">
      {sentences.map((sen) => (
        <li key={sen.id} className="flex gap-3 text-sm">
          <LuGavel aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
          <div>
            <p>
              <span className="font-semibold">
                {COURT_LEVEL_LABEL[sen.courtLevel]}
                {sen.isFinal && " (확정)"}
              </span>{" "}
              {sen.penalty ?? SENTENCE_TYPE_LABEL[sen.type]}
            </p>
            {sen.verdict && <p className="mt-0.5 leading-6 text-muted">{sen.verdict}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function FinalSentenceCard({
  suspect,
  sentence,
  canVote,
}: {
  suspect: Suspect;
  sentence: Sentence;
  canVote: boolean;
}) {
  const court = sentence.courtName ?? COURT_LEVEL_LABEL[sentence.courtLevel];
  const history = suspect.sentences.filter((s) => s.id !== sentence.id);
  const heading = sentence.isFinal ? "확정 형량" : "최근 판결";
  return (
    <section
      aria-label={heading}
      className="rounded-2xl border border-line bg-surface p-5 md:p-7"
    >
      <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[#c46a4b]">
        <LuGavel aria-hidden className="size-4" />
        {heading}
      </p>
      <p className="mt-4 text-center text-sm text-muted">
        {suspect.name ?? suspect.alias ?? "신원 미상"}
      </p>
      <p className="mt-1 text-center text-4xl leading-tight font-black tracking-tight break-keep md:text-5xl">
        {sentence.penalty ?? SENTENCE_TYPE_LABEL[sentence.type]}
      </p>
      <p className="mt-3 text-center text-xs text-subtle">
        {court}
        {sentence.decidedAt && ` · ${formatCaseDate(sentence.decidedAt, "DAY")}`}
      </p>
      {canVote && sentence.isFinal && sentence.type !== "ACQUITTAL" && (
        <SentenceVote sentenceId={sentence.id} />
      )}
      {history.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="mb-3 text-sm font-semibold text-muted">재판 경과</h3>
          <SentenceList sentences={history} />
        </div>
      )}
    </section>
  );
}

function SentencePanel({ data }: { data: CaseDetail }) {
  const sentences = sentencedSuspects(data);
  if (sentences.length === 0) return <Empty>등록된 판결 정보가 없습니다.</Empty>;
  return (
    <div className="space-y-5">
      {sentences.map(({ suspect, sentence }) => (
        <FinalSentenceCard
          key={sentence.id}
          suspect={suspect}
          sentence={sentence}
          canVote={!data.unpublished}
        />
      ))}
    </div>
  );
}

function OverviewPanel({ data }: { data: CaseDetail }) {
  return (
    <div className="space-y-5">
      <p className="text-lg leading-8 font-medium">{data.summary}</p>
      {data.overview && (
        <p className="leading-8 whitespace-pre-line text-muted">{data.overview}</p>
      )}
      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface p-4 text-sm sm:grid-cols-4">
        <Fact label="발생" value={formatCaseDate(data.occurredAt, data.occurredAtPrecision)} />
        <Fact label="국가" value={COUNTRY_LABEL[caseRoomCountry(data.country)]} />
        <Fact label="유형" value={CATEGORY_LABEL[data.category]} />
        <Fact label="피해자" value={`${data.victims.length}명`} />
      </dl>
      <RecentNews data={data} />
    </div>
  );
}

/** 관리실에서 이 사건에 연결해 공개한 최근 기사. 수사·재판 중인 사건이 어떻게 이어지는지 보여 줌 */
function RecentNews({ data }: { data: CaseDetail }) {
  const items = data.newsItems ?? [];
  if (items.length === 0) return null;
  return (
    <section aria-label="최근 소식" className="rounded-xl border border-line bg-surface p-4">
      <h3 className="text-sm font-semibold">최근 소식</h3>
      <ul className="mt-2 space-y-2">
        {items.map((n) => (
          <li key={n.id} className="text-sm leading-6">
            <a href={n.url} target="_blank" rel="noreferrer noopener" className="hover:underline">
              {n.titleKo ?? n.title}
            </a>
            <span className="ml-1.5 text-xs text-subtle">
              {n.publisher}
              {n.publishedAt && ` · ${formatCaseDate(n.publishedAt, "DAY", "Asia/Seoul")}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

function TimelinePanel({ data }: { data: CaseDetail }) {
  if (data.timeline.length === 0) return <Empty>정리된 타임라인이 아직 없습니다.</Empty>;
  return (
    <ol className="relative ml-2 border-l-2 border-dashed border-line">
      {data.timeline.map((e) => (
        <li key={e.id} className="relative pb-7 pl-6 last:pb-0">
          <span
            aria-hidden
            className="absolute top-1.5 -left-[7px] size-3 rounded-full border-2 border-surface bg-[#c46a4b]"
          />
          <p className="font-mono text-xs font-semibold text-[#c46a4b]">
            {formatCaseDate(e.occurredAt, e.occurredAtPrecision, "Asia/Seoul")}
          </p>
          <p className="mt-1 font-semibold">{e.title}</p>
          {e.description && (
            <p className="mt-1 text-sm leading-6 text-muted">{e.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

function VictimsPanel({ data }: { data: CaseDetail }) {
  if (data.victims.length === 0 && !data.victimCountNote)
    return <Empty>등록된 피해자 정보가 없습니다.</Empty>;
  return (
    <>
    {data.victimCountNote && (
      <p className="mb-3 rounded-xl border border-line bg-surface p-4 text-sm font-semibold">
        피해자 수: {data.victimCountNote}
      </p>
    )}
    <ul className="grid gap-3 sm:grid-cols-2">
      {data.victims.map((v) => (
        <li key={v.id} className="rounded-xl border border-line bg-surface p-4">
          <p className="font-semibold">
            {v.name ?? v.alias ?? "이름 비공개"}
            {v.age !== null && (
              <span className="ml-1.5 text-sm font-normal text-subtle">당시 {v.age}세</span>
            )}
          </p>
          <p className="mt-1 text-xs text-subtle">{VICTIM_STATUS_LABEL[v.status]}</p>
          {v.description && (
            <p className="mt-2 text-sm leading-6 text-muted">{v.description}</p>
          )}
        </li>
      ))}
    </ul>
    </>
  );
}

/** API가 공개 조건을 통과한 가해자에게만 신상공개 정보를 내려줌 */
function SuspectDisclosure({ suspect }: { suspect: Suspect }) {
  if (!suspect.identityDisclosedAt) return null;
  return (
    <div className="mt-3 flex items-start gap-3">
      {suspect.photoUrl && (
        <Image
          src={suspect.photoUrl}
          alt={`${suspect.name ?? suspect.alias ?? "가해자"} 공개 사진`}
          width={96}
          height={120}
          unoptimized
          className="h-30 w-24 shrink-0 rounded-lg border border-line object-cover"
        />
      )}
      <div className="text-xs leading-5 text-subtle">
        <p>
          신상공개 결정: {formatCaseDate(suspect.identityDisclosedAt, "DAY")} (
          {suspect.identityDisclosureAgency})
        </p>
        {suspect.photoUrl && suspect.photoSourceAgency && (
          <p>사진 출처: {suspect.photoSourceAgency}</p>
        )}
      </div>
    </div>
  );
}

function SuspectsPanel({ data }: { data: CaseDetail }) {
  if (data.suspects.length === 0)
    return <Empty>아직 특정된 가해자나 용의자가 없습니다.</Empty>;
  const representative = new Map(
    sentencedSuspects(data).map(({ suspect, sentence }) => [suspect.id, sentence]),
  );
  return (
    <ul className="space-y-3">
      {data.suspects.map((s) => (
        <li key={s.id} className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{s.name ?? s.alias ?? "신원 미상"}</p>
            <span className="rounded-full bg-line/60 px-2.5 py-0.5 text-xs text-muted">
              {SUSPECT_STATUS_LABEL[s.status]}
            </span>
          </div>
          <SuspectDisclosure suspect={s} />
          {s.charges && (
            <p className="mt-2 text-sm">
              <span className="text-subtle">혐의 </span>
              {s.charges}
            </p>
          )}
          {s.description && (
            <p className="mt-1 text-sm leading-6 text-muted">{s.description}</p>
          )}
          {s.sentences.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              {/* 해결된 사건의 판결 상세는 형량 탭에서 보여주므로 한 줄로 요약함 */}
              <SentenceList
                sentences={
                  data.status === "SOLVED"
                    ? [{ ...representative.get(s.id)!, verdict: null }]
                    : s.sentences
                }
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function CircumstancesPanel({ data }: { data: CaseDetail }) {
  if (data.suspiciousCircumstances.length === 0)
    return <Empty>정리된 의심 정황이 아직 없습니다.</Empty>;
  return (
    <ul className="space-y-3">
      {data.suspiciousCircumstances.map((c) => (
        <li
          key={c.id}
          className="rounded-xl border border-line bg-surface p-4 shadow-[2px_2px_0_rgb(47_44_40/0.06)]"
        >
          <p className="font-semibold">📌 {c.title}</p>
          {c.description && <p className="mt-1 text-sm leading-6 text-muted">{c.description}</p>}
        </li>
      ))}
    </ul>
  );
}

function QuestionsPanel({ data }: { data: CaseDetail }) {
  return (
    <CaseNotes
      slug={data.slug}
      solved={data.status === "SOLVED"}
      questions={data.unsolvedQuestions}
      readOnly={data.unpublished}
    />
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-subtle">
      {children}
    </p>
  );
}

export function CaseDetailSkeleton() {
  return (
    <div aria-busy className="animate-pulse space-y-4">
      <div className="h-4 w-48 rounded bg-line/70" />
      <div className="h-8 w-2/3 rounded bg-line/70" />
      <div className="mt-6 flex gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-5 w-14 rounded bg-line/50" />
        ))}
      </div>
      <div className="mt-6 h-48 rounded-2xl bg-surface/70" />
    </div>
  );
}
