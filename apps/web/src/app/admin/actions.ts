"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/cases/api";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_HINT_COOKIE,
  AdminApiError,
  NO_ANALYTICS_COOKIE,
  NO_ANALYTICS_MAX_AGE,
  adminSend,
  clientIp,
} from "@/lib/admin/session";
import type { ActionState, BriefingPost } from "@/lib/admin/types";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** API 오류를 화면 문구로 바꿈. redirect()가 던지는 제어 흐름 예외는 그대로 다시 던짐 */
async function run(task: () => Promise<unknown>, ok: string): Promise<ActionState> {
  try {
    await task();
  } catch (error) {
    if (error instanceof AdminApiError) return { error: error.message };
    throw error;
  }
  refresh();
  return { ok };
}

// ---- 로그인 ----

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const password = String(form.get("password") ?? "");
  if (!password) return { error: "비밀번호를 입력해 주세요." };
  let res: Response;
  try {
    res = await fetch(`${API_URL}/admin/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-ip": await clientIp() },
      body: JSON.stringify({ password }),
      cache: "no-store",
    });
  } catch {
    return { error: "API 서버에 연결할 수 없습니다." };
  }
  const body = (await res.json().catch(() => null)) as { token?: string; message?: string } | null;
  if (!res.ok || !body?.token) return { error: body?.message ?? "로그인하지 못했습니다." };
  (await cookies()).set(ADMIN_COOKIE, body.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // 다른 사이트에서 시작된 요청에는 쿠키가 실리지 않음 (CSRF 방어)
    sameSite: "strict",
    path: "/admin",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  (await cookies()).set(ADMIN_HINT_COOKIE, "1", { sameSite: "lax", path: "/", maxAge: ADMIN_COOKIE_MAX_AGE });
  // 관리자가 로그인한 기기는 로그아웃 뒤에도 방문자 분석에서 뺌 (관리실 '방문자 분석'에서 다시 셀 수 있음)
  (await cookies()).set(NO_ANALYTICS_COOKIE, "1", { sameSite: "lax", path: "/", httpOnly: true, maxAge: NO_ANALYTICS_MAX_AGE });
  redirect("/admin");
}

/** 이 기기에서 둘러본 것을 방문자 분석에서 빼거나 다시 셈 */
export async function setDeviceExcluded(excluded: boolean) {
  const jar = await cookies();
  if (excluded) jar.set(NO_ANALYTICS_COOKIE, "1", { sameSite: "lax", path: "/", httpOnly: true, maxAge: NO_ANALYTICS_MAX_AGE });
  else jar.delete({ name: NO_ANALYTICS_COOKIE, path: "/" });
  refresh();
}

export async function logout() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
  (await cookies()).delete({ name: ADMIN_HINT_COOKIE, path: "/" });
  redirect("/admin/login");
}

// ---- 사건 ----

export async function updateCase(id: string, _: ActionState, form: FormData) {
  const nullable = (key: string) => text(form, key) || null;
  return run(
    () =>
      adminSend(`/cases/${id}`, "PATCH", {
        title: text(form, "title"),
        summary: text(form, "summary"),
        overview: nullable("overview"),
        victimCountNote: nullable("victimCountNote"),
        country: text(form, "country"),
        category: text(form, "category"),
        status: text(form, "status"),
        location: nullable("location"),
        occurredAt: text(form, "occurredAt"),
        occurredAtPrecision: text(form, "occurredAtPrecision"),
        solvedAt: text(form, "solvedAt"),
      }),
    "저장했습니다.",
  );
}

export async function reviewCase(id: string, _: ActionState, form: FormData) {
  return run(
    () =>
      adminSend(`/cases/${id}/review`, "POST", {
        status: text(form, "status"),
        note: text(form, "note") || undefined,
      }),
    "검토 상태를 바꿨습니다.",
  );
}

export async function publishCase(id: string, published: boolean) {
  return run(
    () => adminSend(`/cases/${id}/publish`, "POST", { published }),
    published ? "공개했습니다. 브리핑룸 초안에 ‘새 사건 파일’ 글이 생겼습니다." : "비공개로 바꿨습니다.",
  );
}

export async function addCaseSource(id: string, _: ActionState, form: FormData) {
  return run(
    () =>
      adminSend(`/cases/${id}/sources`, "POST", {
        url: text(form, "url"),
        title: text(form, "title"),
        publisher: text(form, "publisher"),
        type: text(form, "type") || "NEWS",
        publishedAt: text(form, "publishedAt") || null,
      }),
    "출처를 추가했습니다. 검토 상태를 다시 확인해 주세요.",
  );
}

export async function removeCaseSource(id: string, sourceId: string) {
  return run(() => adminSend(`/cases/${id}/sources/${sourceId}`, "DELETE"), "출처를 지웠습니다.");
}

/** 관련 콘텐츠(방송·다큐·유튜브 등) 폼 값 → API 형식 */
function relatedBody(form: FormData) {
  return {
    kind: text(form, "kind"),
    title: text(form, "title"),
    platform: text(form, "platform"),
    creator: text(form, "creator") || null,
    url: text(form, "url"),
    releaseYear: text(form, "releaseYear") || null,
    language: text(form, "language") || "ko",
    note: text(form, "note") || null,
    isDramatized: form.get("isDramatized") === "on",
  };
}

export async function addCaseRelated(id: string, _: ActionState, form: FormData) {
  return run(() => adminSend(`/cases/${id}/related`, "POST", relatedBody(form)), "관련 콘텐츠를 추가했습니다.");
}

export async function updateCaseRelated(id: string, relatedId: string, _: ActionState, form: FormData) {
  return run(() => adminSend(`/cases/${id}/related/${relatedId}`, "PATCH", relatedBody(form)), "관련 콘텐츠를 고쳤습니다.");
}

/** 사건이 바꾼 것(법·기념일·제도) 폼 값 → API 형식 */
function changeBody(form: FormData) {
  return {
    kind: text(form, "kind"),
    name: text(form, "name"),
    year: text(form, "year") || null,
    observedOn: text(form, "observedOn") || null,
    country: text(form, "country") || null,
    description: text(form, "description"),
    sourceUrl: text(form, "sourceUrl"),
    sourceTitle: text(form, "sourceTitle"),
  };
}

export async function addCaseChange(id: string, _: ActionState, form: FormData) {
  return run(() => adminSend(`/cases/${id}/changes`, "POST", changeBody(form)), "‘바뀐 것’을 추가했습니다.");
}

export async function updateCaseChange(id: string, changeId: string, _: ActionState, form: FormData) {
  return run(() => adminSend(`/cases/${id}/changes/${changeId}`, "PATCH", changeBody(form)), "‘바뀐 것’을 고쳤습니다.");
}

export async function removeCaseChange(id: string, changeId: string) {
  return run(() => adminSend(`/cases/${id}/changes/${changeId}`, "DELETE"), "‘바뀐 것’을 지웠습니다.");
}

/** 타임라인 폼 값 → API 형식 */
function timelineBody(form: FormData) {
  return {
    occurredAt: text(form, "occurredAt") || null,
    occurredAtPrecision: text(form, "occurredAtPrecision"),
    title: text(form, "title"),
    description: text(form, "description") || null,
  };
}

export async function addCaseTimeline(id: string, _: ActionState, form: FormData) {
  return run(() => adminSend(`/cases/${id}/timeline`, "POST", timelineBody(form)), "타임라인을 추가했습니다.");
}

export async function updateCaseTimeline(id: string, eventId: string, _: ActionState, form: FormData) {
  return run(() => adminSend(`/cases/${id}/timeline/${eventId}`, "PATCH", timelineBody(form)), "타임라인을 고쳤습니다.");
}

export async function removeCaseTimeline(id: string, eventId: string) {
  return run(() => adminSend(`/cases/${id}/timeline/${eventId}`, "DELETE"), "타임라인을 지웠습니다.");
}

export async function removeCaseRelated(id: string, relatedId: string) {
  return run(() => adminSend(`/cases/${id}/related/${relatedId}`, "DELETE"), "관련 콘텐츠를 지웠습니다.");
}

/** 사건방에 넣을 필요가 없는 초안을 지움. 공개 중이면 API가 막음 */
export async function deleteCase(id: string): Promise<ActionState> {
  try {
    await adminSend(`/cases/${id}`, "DELETE");
  } catch (error) {
    if (error instanceof AdminApiError) return { error: error.message };
    throw error;
  }
  redirect("/admin/cases");
}

// ---- 부적절한 글 ----

export async function moderate(
  type: string,
  id: string,
  action: "publish" | "hide" | "block" | "dismiss",
) {
  const done = {
    publish: "공개했습니다.",
    hide: "숨겼습니다.",
    block: "차단했습니다.",
    dismiss: "신고를 기각했습니다. 신고 기록을 지우고 공개로 두었습니다.",
  }[action];
  return run(() => adminSend(`/moderation/${type}/${id}`, "POST", { action }), done);
}

export async function blockVoter(voterId: string, _: ActionState, form: FormData) {
  return run(
    () => adminSend(`/voters/${voterId}/block`, "POST", { reason: text(form, "reason") || undefined }),
    "참여를 제한하고 이 사람의 공개 글을 숨겼습니다.",
  );
}

export async function unblockVoter(voterId: string) {
  return run(() => adminSend(`/voters/${voterId}/block`, "DELETE"), "참여 제한을 풀었습니다.");
}

// ---- 브리핑 글 ----

function postBody(form: FormData) {
  return {
    kind: text(form, "kind"),
    title: text(form, "title"),
    body: text(form, "body"),
    isPinned: form.get("isPinned") === "on",
    caseId: text(form, "caseId") || null,
    status: text(form, "status") || "DRAFT",
  };
}

export async function createPost(_: ActionState, form: FormData): Promise<ActionState> {
  let created: BriefingPost;
  try {
    created = await adminSend<BriefingPost>("/briefing", "POST", postBody(form));
  } catch (error) {
    if (error instanceof AdminApiError) return { error: error.message };
    throw error;
  }
  redirect(`/admin/briefing/${created.id}`);
}

export async function updatePost(id: string, _: ActionState, form: FormData) {
  return run(() => adminSend(`/briefing/${id}`, "PATCH", postBody(form)), "저장했습니다.");
}

export async function setPostStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  return run(
    () => adminSend(`/briefing/${id}`, "PATCH", { status }),
    status === "PUBLISHED" ? "브리핑룸에 공개했습니다." : "초안으로 내렸습니다.",
  );
}

export async function deletePost(id: string): Promise<ActionState> {
  try {
    await adminSend(`/briefing/${id}`, "DELETE");
  } catch (error) {
    if (error instanceof AdminApiError) return { error: error.message };
    throw error;
  }
  redirect("/admin/briefing");
}

export async function draftOpinionSummary(_: ActionState, form: FormData): Promise<ActionState> {
  let created: BriefingPost;
  try {
    created = await adminSend<BriefingPost>("/briefing/opinion-summary", "POST", {
      caseId: text(form, "caseId"),
    });
  } catch (error) {
    if (error instanceof AdminApiError) return { error: error.message };
    throw error;
  }
  redirect(`/admin/briefing/${created.id}`);
}

// ---- 문의·의견 ----

export async function replyInquiry(id: string, _: ActionState, form: FormData) {
  return run(
    () => adminSend(`/inquiries/${id}/reply`, "POST", { reply: text(form, "reply") }),
    "답변을 남겼습니다. 보낸 사람이 문의하기 페이지에서 볼 수 있습니다.",
  );
}

export async function setInquiryStatus(id: string, status: string) {
  return run(() => adminSend(`/inquiries/${id}`, "PATCH", { status }), "상태를 바꿨습니다.");
}

// ---- 새 뉴스 ----

export async function setNewsStatus(id: string, status: "PUBLISHED" | "DISMISSED" | "NEW", _: ActionState, form: FormData) {
  const caseId = form.get("caseId");
  const titleKo = form.get("titleKo");
  return run(
    () =>
      adminSend(`/news/${id}`, "POST", {
        status,
        ...(typeof caseId === "string" && { caseId }),
        ...(typeof titleKo === "string" && titleKo.trim() && { titleKo: titleKo.trim() }),
        ...(text(form, "timelineTitle") && { timelineTitle: text(form, "timelineTitle") }),
      }),
    { PUBLISHED: "브리핑룸에 올렸습니다.", DISMISSED: "숨겼습니다.", NEW: "확인 전으로 돌렸습니다." }[status],
  );
}

/** 기사 하나로 '수사 중' 사건 초안을 만들고 그 사건 편집 화면으로 이동 */
export async function createCaseFromNews(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  let created: { id: string };
  try {
    created = await adminSend<{ id: string }>(`/news/${id}/case`, "POST", {
      title: text(form, "title"),
      summary: text(form, "summary"),
      category: text(form, "category"),
      location: text(form, "location"),
      timelineTitle: text(form, "timelineTitle"),
    });
  } catch (error) {
    if (error instanceof AdminApiError) return { error: error.message };
    throw error;
  }
  redirect(`/admin/cases/${created.id}`);
}

export async function translateNews() {
  let result: { translated: number };
  try {
    result = await adminSend<{ translated: number }>("/news/translate", "POST");
  } catch (error) {
    if (error instanceof AdminApiError) return { error: error.message };
    throw error;
  }
  refresh();
  return { ok: `해외 기사 제목 ${result.translated}건을 번역했습니다.` };
}

export async function syncNews() {
  let result: { added: number; failedQueries: string[] };
  try {
    result = await adminSend("/news/sync", "POST");
  } catch (error) {
    if (error instanceof AdminApiError) return { error: error.message };
    throw error;
  }
  refresh();
  return {
    ok: `새 기사 ${result.added}건을 가져왔습니다.${result.failedQueries.length ? ` (실패한 검색어: ${result.failedQueries.join(", ")})` : ""}`,
  };
}

export async function dismissAllNews() {
  return run(() => adminSend("/news/dismiss-all", "POST"), "확인 안 한 기사를 모두 숨겼습니다.");
}

// ---- 인스타 성과 기록 ----

const num = (form: FormData, key: string) => Math.max(0, Math.round(Number(text(form, key)) || 0));

/** 비어 있으면 null, 값이 있으면 숫자 (릴스 상세는 선택 입력) */
const optNum = (form: FormData, key: string) => {
  const raw = text(form, key);
  return raw === "" || Number.isNaN(Number(raw)) ? null : Number(raw);
};

/** "0:100, 2:30, 5:12" → [{t:0,p:100},...]  (초:남은 시청 %) */
function parseRetention(raw: string) {
  const points = raw
    .split(/[,\n]/)
    .map((part) => part.trim().split(":").map(Number))
    .filter(([t, p]) => Number.isFinite(t) && Number.isFinite(p))
    .map(([t, p]) => ({ t, p }));
  return points.length > 0 ? points : null;
}

function instagramBody(form: FormData) {
  return {
    postedOn: text(form, "postedOn"),
    kind: text(form, "kind"),
    title: text(form, "title"),
    caseSlug: text(form, "caseSlug") || null,
    reach: num(form, "reach"),
    likes: num(form, "likes"),
    saves: num(form, "saves"),
    shares: num(form, "shares"),
    profileVisits: num(form, "profileVisits"),
    followsGained: num(form, "followsGained"),
    note: text(form, "note") || null,
    views: optNum(form, "views"),
    viewers: optNum(form, "viewers"),
    avgWatchSec: optNum(form, "avgWatchSec"),
    durationSec: optNum(form, "durationSec"),
    skipRate: optNum(form, "skipRate"),
    srcReels: optNum(form, "srcReels"),
    srcExplore: optNum(form, "srcExplore"),
    srcProfile: optNum(form, "srcProfile"),
    srcFollow: optNum(form, "srcFollow"),
    retention: parseRetention(text(form, "retention")),
  };
}

export async function addInstagramPost(_: ActionState, form: FormData) {
  return run(() => adminSend("/instagram/posts", "POST", instagramBody(form)), "게시물을 기록했습니다.");
}

export async function updateInstagramPost(id: string, _: ActionState, form: FormData) {
  return run(() => adminSend(`/instagram/posts/${id}`, "PATCH", instagramBody(form)), "수정했습니다.");
}

export async function deleteInstagramPost(id: string, _: ActionState, __: FormData) {
  return run(() => adminSend(`/instagram/posts/${id}`, "DELETE"), "삭제했습니다.");
}

export async function setHomeFeatured(slug: string, featured: boolean, _: ActionState, __: FormData) {
  return run(
    () => adminSend(`/instagram/feature/${encodeURIComponent(slug)}`, "PATCH", { featured }),
    featured ? "홈 대표 사건으로 지정했습니다." : "홈 대표 지정을 풀었습니다.",
  );
}
