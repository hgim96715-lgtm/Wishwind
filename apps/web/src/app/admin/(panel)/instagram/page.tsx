import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CopyText } from "@/components/admin/CopyText";
import { Card, Empty, ErrorBox, PageTitle, Skeleton } from "@/components/admin/ui";
import {
  anniversaryCaption,
  caseCaption,
  changeCaption,
  dateLabel,
  dayCaption,
  pickChanges,
  upcomingAnniversaries,
  upcomingDays,
} from "@/lib/admin/instagram";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { AdminCaseList } from "@/lib/admin/types";
import { getCase } from "@/lib/cases/api";
import { getChanges } from "@/lib/cases/changes";
import { INSTAGRAM_URL } from "@/lib/site";

export const metadata: Metadata = { title: "인스타 준비" };

const linkClass = "text-xs font-medium text-[#2f7469] transition-opacity hover:opacity-70";

export default function InstagramPage() {
  return (
    <>
      <PageTitle
        title="인스타 준비"
        description="사건이 일어난 날, 다가오는 기념일, 최근 공개한 사건, 사건이 바꾼 법·제도를 인스타 글감으로 모았습니다. 문구를 복사하고 스토리 이미지를 저장해 올리면 됩니다."
      />
      <div className="space-y-8">
        <Guide />
        <Suspense fallback={<Skeleton />}>
          <Anniversaries />
        </Suspense>
        <Suspense fallback={<Skeleton />}>
          <Upcoming />
        </Suspense>
        <Suspense fallback={<Skeleton />}>
          <RecentCases />
        </Suspense>
        <Suspense fallback={<Skeleton />}>
          <ChangePicks />
        </Suspense>
        <AutoUpload />
      </div>
    </>
  );
}

function Guide() {
  return (
    <Card>
      <h2 className="font-semibold">올릴 때 지킬 것</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>피해자 사진과 얼굴은 올리지 않습니다. 스토리 이미지에도 넣지 않았습니다.</li>
        <li>확정 판결 전인 사람은 실명 대신 직책이나 &apos;피고인&apos;으로 씁니다.</li>
        <li>사건을 자극적으로 꾸미지 않고, 재발 방지와 기억에 초점을 둡니다.</li>
        <li>기념일 글은 그날 아침에 올리면 가장 잘 읽힙니다.</li>
      </ul>
      <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" className={`mt-3 inline-block ${linkClass}`}>
        Wishwind 인스타 열기
      </a>
    </Card>
  );
}

async function Upcoming() {
  // 오늘 날짜로 계산하므로 요청 때마다 다시 그림
  await connection();
  const days = upcomingDays(await getChanges(), new Date(), 60);
  return (
    <section>
      <h2 className="text-lg font-semibold">다가오는 기념일 (60일)</h2>
      {days.length === 0 ? (
        <div className="mt-3">
          <Empty>앞으로 60일 안에 돌아오는 기념일이 없습니다.</Empty>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {days.map((d) => (
            <Card key={d.item.id}>
              <p className="text-xs text-subtle">
                {dateLabel(d.date)} · {d.daysLeft === 0 ? "오늘" : `${d.daysLeft}일 남음`}
              </p>
              <h3 className="mt-1 font-semibold">{d.item.name}</h3>
              <p className="mt-0.5 text-xs text-subtle">{d.item.case.title}</p>
              <CopyText text={dayCaption(d)} />
              <Links slug={d.item.case.slug} />
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

/** 사건이 일어난 날(월·일)이 오늘부터 7일 안에 돌아오는 공개 사건 */
async function Anniversaries() {
  await connection();
  let rows: AdminCaseList["items"];
  try {
    rows = (await adminGet<AdminCaseList>("/cases?published=true")).items;
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  const picks = upcomingAnniversaries(rows, new Date(), 7);
  const details = await Promise.all(picks.map((p) => getCase(p.row.slug)));
  return (
    <section>
      <h2 className="text-lg font-semibold">○년 전 이날 (7일)</h2>
      <p className="mt-1 text-sm text-muted">사건이 일어난 날이 오늘부터 7일 안에 돌아오는 사건입니다. 그날 아침에 올리면 됩니다.</p>
      {picks.length === 0 ? (
        <div className="mt-3">
          <Empty>앞으로 7일 안에 일어난 날이 돌아오는 사건이 없습니다.</Empty>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {picks.map((p, i) => {
            const d = details[i];
            if (!d) return null;
            return (
              <Card key={p.row.id}>
                <p className="text-xs text-subtle">
                  {dateLabel(p.date)} · {p.daysLeft === 0 ? "오늘" : `${p.daysLeft}일 남음`} · {p.yearsAgo}년 전
                </p>
                <h3 className="mt-1 font-semibold">{d.title}</h3>
                <CopyText text={anniversaryCaption(d, p)} />
                <Links slug={d.slug} />
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

async function RecentCases() {
  let rows: AdminCaseList["items"];
  try {
    rows = (await adminGet<AdminCaseList>("/cases?published=true")).items.slice(0, 4);
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  const details = (await Promise.all(rows.map((r) => getCase(r.slug)))).filter((d) => d !== null);
  return (
    <section>
      <h2 className="text-lg font-semibold">최근 공개·수정한 사건</h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {details.map((d) => (
          <Card key={d.slug}>
            <h3 className="font-semibold">{d.title}</h3>
            <CopyText text={caseCaption(d)} />
            <Links slug={d.slug} />
          </Card>
        ))}
      </div>
    </section>
  );
}

/** 오늘 날짜로 돌아가며 법·제도 두 개를 고름 (날마다 다른 글감) */
async function ChangePicks() {
  await connection();
  const items = (await getChanges()).filter((c) => c.kind !== "DAY");
  if (items.length === 0) return null;
  const picks = pickChanges(items, new Date());
  return (
    <section>
      <h2 className="text-lg font-semibold">알고 계셨나요? 글감</h2>
      <p className="mt-1 text-sm text-muted">사건이 바꾼 법·제도 가운데 두 개를 날마다 바꿔 보여 줍니다.</p>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {picks.map((c) => (
          <Card key={c.id}>
            <h3 className="font-semibold">{c.name}</h3>
            <p className="mt-0.5 text-xs text-subtle">{c.case.title}</p>
            <CopyText text={changeCaption(c)} />
            <Links slug={c.case.slug} />
          </Card>
        ))}
      </div>
    </section>
  );
}

function Links({ slug }: { slug: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
      <a href={`/api/flyer/case/${slug}`} target="_blank" rel="noreferrer noopener" className={linkClass}>
        스토리 이미지 열기
      </a>
      <a href={`/api/flyer/post/${slug}`} target="_blank" rel="noreferrer noopener" className={linkClass}>
        게시물 이미지 열기 (4:5)
      </a>
      <Link href={`/cases/${slug}`} target="_blank" className={linkClass}>
        사건 페이지
      </Link>
    </div>
  );
}

function AutoUpload() {
  return (
    <Card>
      <h2 className="font-semibold">자동 업로드</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        인스타그램은 비즈니스·크리에이터 계정이면 Meta의 공식 API(Instagram Graph API)로 사진과 글을 자동으로 올릴 수 있습니다.
        지금은 연결되어 있지 않아 위 문구와 이미지를 직접 올려야 합니다.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>인스타 계정을 비즈니스(또는 크리에이터) 계정으로 바꾸고 페이스북 페이지와 연결합니다.</li>
        <li>Meta 개발자 사이트에서 앱을 만들고 instagram_content_publish 권한을 받습니다.</li>
        <li>발급한 액세스 토큰을 API 서버 환경 변수에 넣으면, 기념일 아침에 자동으로 올리도록 연결할 수 있습니다.</li>
      </ol>
      <p className="mt-3 text-xs text-subtle">
        계정 전환과 토큰 발급은 운영자가 직접 해야 합니다. 연결하면 피드 게시물부터 시작하고, 잘 되면 스토리까지 넓히는 것을 권합니다.
      </p>
    </Card>
  );
}
