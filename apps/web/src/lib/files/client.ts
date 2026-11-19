export type FileType = "case" | "missing";
export type ShareChannel = "link" | "native" | "flyer";

export interface FileStats {
  views: number;
  today: number;
  shares: number;
}

const base = (type: FileType, key: string) => `/api/files/${type}/${encodeURIComponent(key)}`;

export async function fetchFileStats(type: FileType, key: string, signal?: AbortSignal): Promise<FileStats | null> {
  const res = await fetch(`${base(type, key)}`, { signal }).catch(() => null);
  return res?.ok ? ((await res.json()) as FileStats) : null;
}

/** 실패해도 화면에는 영향을 주지 않음 */
export function recordFileEvent(type: FileType, key: string, kind: "VIEW" | "SHARE", channel?: ShareChannel) {
  return fetch(base(type, key), {
    method: "POST",
    body: JSON.stringify({ kind, channel }),
    headers: { "content-type": "application/json" },
    keepalive: true,
  }).catch(() => null);
}

/** 사건은 사건 파일 주소, 실종자는 실종방에서 카드가 바로 열리는 주소 */
export function fileUrl(type: FileType, key: string, origin = window.location.origin) {
  return type === "case" ? `${origin}/cases/${key}` : `${origin}/missing?person=${encodeURIComponent(key)}`;
}
