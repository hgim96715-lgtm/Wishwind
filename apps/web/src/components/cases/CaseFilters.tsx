import Link from "next/link";
import { LuChevronDown, LuSearch, LuX } from "react-icons/lu";
import {
  CATEGORY_LABEL,
  COUNTRY_LABEL,
  COUNTRY_ORDER,
  STATUS_STAMP,
} from "@/lib/cases/labels";
import { hasActiveFilters, type CaseFilters } from "@/lib/cases/filters";
import type { CaseCategory, CaseStatus } from "@/lib/cases/types";

/**
 * 검색·필터 폼. 일반 GET 폼이라 JS 없이도 동작함 → 제출하면 /cases?q=...로 이동하고
 * 서버가 그 쿼리로 다시 렌더링함. 필터 상태가 URL에 남아서 공유·뒤로가기가 자연스러움.
 * key로 현재 쿼리를 넘겨서, 뒤로가기로 URL이 바뀌면 입력값도 그 URL 기준으로 다시 채워짐.
 */
export function CaseFiltersForm({ filters }: { filters: CaseFilters }) {
  const active = hasActiveFilters(filters);
  return (
    <form
      key={JSON.stringify(filters)}
      action="/cases"
      method="get"
      role="search"
      className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgb(47_44_40/0.05)]"
    >
      <label className="relative block">
        <span className="sr-only">사건 검색</span>
        <LuSearch
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle"
        />
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          maxLength={100}
          placeholder="사건 이름, 지역, 키워드로 찾아보기"
          className="w-full rounded-xl border border-line bg-background py-2.5 pr-3 pl-10 text-sm outline-none placeholder:text-subtle focus:border-[#c46a4b]/50 focus:ring-4 focus:ring-[#c46a4b]/10"
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(8rem,1fr))_auto_auto]">
        <Select name="country" label="국가" value={filters.country}>
          {COUNTRY_ORDER.map((c) => (
            <option key={c} value={c}>
              {COUNTRY_LABEL[c]}
            </option>
          ))}
        </Select>
        <Select name="category" label="유형" value={filters.category}>
          {(Object.keys(CATEGORY_LABEL) as CaseCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
        <Select name="status" label="상태" value={filters.status}>
          {(Object.keys(STATUS_STAMP) as CaseStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_STAMP[s].label}
            </option>
          ))}
        </Select>

        <fieldset className="col-span-2 flex items-center gap-1.5 lg:col-span-1">
          <legend className="sr-only">발생 연도</legend>
          <YearInput name="yearFrom" label="부터" value={filters.yearFrom} />
          <span aria-hidden className="text-subtle">~</span>
          <YearInput name="yearTo" label="까지" value={filters.yearTo} />
        </fieldset>

        <div className="col-span-2 flex gap-2 sm:col-span-1">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-[#c46a4b] px-4 py-2 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-[#b05c3f] lg:flex-none"
          >
            찾기
          </button>
          {active && (
            <Link
              href="/cases"
              className="inline-flex items-center gap-1 rounded-xl border border-line px-3 py-2 text-sm whitespace-nowrap text-muted transition-colors hover:text-foreground"
            >
              <LuX aria-hidden className="size-4" />
              초기화
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}

function Select({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      {/* 브라우저 기본 화살표는 위치·모양이 OS마다 달라서 숨기고 아이콘으로 그림 */}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="w-full min-w-0 cursor-pointer appearance-none truncate rounded-xl border border-line bg-background py-2 pr-9 pl-3 text-sm outline-none focus:border-[#c46a4b]/50"
      >
        <option value="">{label} 전체</option>
        {children}
      </select>
      <LuChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle"
      />
    </label>
  );
}

function YearInput({ name, label, value }: { name: string; label: string; value?: string }) {
  return (
    <label className="block flex-1">
      <span className="sr-only">발생 연도 {label}</span>
      <input
        type="number"
        name={name}
        defaultValue={value}
        min={1800}
        max={2100}
        inputMode="numeric"
        placeholder={label === "부터" ? "연도부터" : "연도까지"}
        className="w-full min-w-0 rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none placeholder:text-subtle focus:border-[#c46a4b]/50 lg:w-28"
      />
    </label>
  );
}
