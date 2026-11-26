import { CaseSlugPicker, type CaseOption } from "@/components/admin/CaseSlugPicker";
import { Field, inputClass } from "@/components/admin/ui";
import type { InstagramPostRow } from "@/lib/admin/types";

const KIND_LABEL = { STORY: "스토리", FEED: "피드", REEL: "릴스" } as const;

const COUNTS = [
  ["reach", "도달"],
  ["likes", "좋아요"],
  ["saves", "저장"],
  ["shares", "공유"],
  ["profileVisits", "프로필 방문"],
  ["followsGained", "새 팔로워"],
] as const;

const REEL_FIELDS = [
  ["views", "조회"],
  ["viewers", "조회한 사람"],
  ["avgWatchSec", "평균 조회 시간(초)"],
  ["durationSec", "영상 길이(초)"],
  ["skipRate", "건너뛰기 비율(%)"],
  ["srcReels", "출처: 릴스 탭(%)"],
  ["srcExplore", "출처: 탐색 탭(%)"],
  ["srcProfile", "출처: 프로필(%)"],
  ["srcFollow", "출처: 팔로워 등(%)"],
] as const;

/** 기록 추가와 기록 수정이 같은 입력칸을 씀. post가 있으면 그 값이 처음에 채워짐 */
export function InstagramPostFields({ post, today, cases = [] }: { post?: InstagramPostRow; today?: string; cases?: CaseOption[] }) {
  const retention = post?.retention?.map((r) => `${r.t}:${r.p}`).join(", ") ?? "";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="올린 날">
          <input type="date" name="postedOn" required defaultValue={post?.postedOn ?? today} className={inputClass} />
        </Field>
        <Field label="종류">
          <select name="kind" defaultValue={post?.kind ?? "REEL"} className={inputClass}>
            {Object.entries(KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="다룬 사건 (선택)" hint="고르면 홈 '방금 릴스에서 보셨나요?'에 나옴">
          <CaseSlugPicker cases={cases} initial={post?.caseSlug} />
        </Field>
      </div>
      <Field label="제목·메모용 이름">
        <input name="title" required maxLength={200} defaultValue={post?.title ?? ""} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {COUNTS.map(([name, label]) => (
          <Field key={name} label={label}>
            <input type="number" name={name} min={0} defaultValue={post?.[name] ?? 0} className={inputClass} />
          </Field>
        ))}
      </div>
      <details open={post ? REEL_FIELDS.some(([n]) => post[n] != null) : false} className="rounded-md border border-line px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">릴스 인사이트 상세 (선택, 인사이트 화면 그대로)</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {REEL_FIELDS.map(([name, label]) => (
            <Field key={name} label={label}>
              <input type="number" name={name} min={0} step="any" defaultValue={post?.[name] ?? ""} className={inputClass} />
            </Field>
          ))}
        </div>
        <div className="mt-3">
          <Field label="시청 유지 곡선 (선택)" hint="그래프를 보고 '초:남은 %'를 쉼표로. 예: 0:100, 2:30, 5:12, 26:3">
            <input name="retention" maxLength={400} defaultValue={retention} className={inputClass} />
          </Field>
        </div>
      </details>
      <Field label="메모 (선택)">
        <input name="note" maxLength={500} defaultValue={post?.note ?? ""} className={inputClass} />
      </Field>
    </>
  );
}
