import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { API_URL } from "@/lib/cases/api";
import type { CaseListResponse } from "@/lib/cases/types";
import { SITE_URL } from "@/lib/site";

const STATIC_PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/cases", priority: 0.9, changeFrequency: "daily" },
  { path: "/briefing", priority: 0.8, changeFrequency: "hourly" },
  { path: "/missing", priority: 0.8, changeFrequency: "daily" },
  { path: "/help", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
];

/** 공개 사건 주소 전체. API가 꺼져 있으면 고정 페이지만 내보냄 */
async function caseEntries(): Promise<{ slug: string; updatedAt?: string }[]> {
  "use cache";
  cacheLife("hours");
  const out: { slug: string; updatedAt?: string }[] = [];
  let cursor: string | null = null;
  try {
    for (let page = 0; page < 50; page++) {
      const qs = new URLSearchParams({ take: "100", ...(cursor ? { cursor } : {}) });
      const res = await fetch(`${API_URL}/cases?${qs}`);
      if (!res.ok) break;
      const data = (await res.json()) as CaseListResponse;
      for (const c of data.items) out.push({ slug: c.slug, updatedAt: (c as { updatedAt?: string }).updatedAt });
      if (!data.nextCursor) break;
      cursor = data.nextCursor;
    }
  } catch {
    // API가 꺼져 있으면 고정 페이지만
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cases = await caseEntries();
  return [
    ...STATIC_PAGES.map((p) => ({ url: `${SITE_URL}${p.path}`, changeFrequency: p.changeFrequency, priority: p.priority })),
    ...cases.map((c) => ({
      url: `${SITE_URL}/cases/${encodeURIComponent(c.slug)}`,
      ...(c.updatedAt && { lastModified: c.updatedAt }),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
