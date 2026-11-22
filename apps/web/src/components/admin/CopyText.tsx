"use client";

import { useState } from "react";

/** 인스타 글감: 문구를 보여 주고, 버튼으로 통째로 복사 */
export function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState<"ok" | "fail" | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone("ok");
    } catch {
      setDone("fail");
    }
    setTimeout(() => setDone(null), 2000);
  };
  return (
    <div className="mt-3">
      <pre className="max-h-56 overflow-auto rounded-md border border-line bg-background p-3 text-xs leading-5 whitespace-pre-wrap text-muted">{text}</pre>
      <button
        type="button"
        onClick={copy}
        className="mt-2 rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-line/50"
      >
        {done === "ok" ? "복사했습니다" : done === "fail" ? "복사하지 못했습니다" : "문구 복사"}
      </button>
    </div>
  );
}
