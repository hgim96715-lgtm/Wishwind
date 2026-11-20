"use client";

import { useEffect, useState, type FormEvent } from "react";

type Kind = "QUESTION" | "CORRECTION" | "FEEDBACK";
type Status = "OPEN" | "ANSWERED" | "CLOSED";

interface MyInquiry {
  id: string;
  kind: Kind;
  status: Status;
  body: string;
  caseSlug: string | null;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  /** 관리자가 아직 보지 않아 고칠 수 있음 */
  editable: boolean;
}

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: "CORRECTION", label: "정정 요청", hint: "사건 기록에서 틀린 내용" },
  { value: "QUESTION", label: "문의", hint: "궁금한 점" },
  { value: "FEEDBACK", label: "의견", hint: "사이트에 바라는 점" },
];
const KIND_LABEL: Record<Kind, string> = { QUESTION: "문의", CORRECTION: "정정 요청", FEEDBACK: "의견" };
const STATUS_LABEL: Record<Status, string> = { OPEN: "확인 중", ANSWERED: "답변 완료", CLOSED: "확인 완료" };
const MAX = 2000;
const dateFmt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" });

export function ContactForm({ initialCase }: { initialCase: string }) {
  const [kind, setKind] = useState<Kind>(initialCase ? "CORRECTION" : "QUESTION");
  const [body, setBody] = useState("");
  const [caseSlug, setCaseSlug] = useState(initialCase);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [mine, setMine] = useState<MyInquiry[]>([]);

  useEffect(() => {
    fetch("/api/inquiries")
      .then((r) => (r.ok ? (r.json() as Promise<MyInquiry[]>) : []))
      .then(setMine)
      .catch(() => {});
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, body, caseSlug: caseSlug.trim() || undefined }),
      });
      const data = (await res.json()) as { message?: string | string[]; mine?: MyInquiry[] };
      if (!res.ok) {
        setMessage({ ok: false, text: typeof data.message === "string" ? data.message : "보내지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
        return;
      }
      setMessage({ ok: true, text: typeof data.message === "string" ? data.message : "보냈습니다." });
      setBody("");
      if (data.mine) setMine(data.mine);
    } catch {
      setMessage({ ok: false, text: "보내지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-line bg-surface p-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">어떤 내용인가요?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {KINDS.map((k) => (
              <label
                key={k.value}
                className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  kind === k.value ? "border-foreground bg-background" : "border-line hover:border-foreground/40"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k.value}
                  checked={kind === k.value}
                  onChange={() => setKind(k.value)}
                  className="sr-only"
                />
                <span className="block font-medium">{k.label}</span>
                <span className="block text-xs text-subtle">{k.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {kind !== "FEEDBACK" && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">관련 사건 주소 (선택)</span>
            <input
              value={caseSlug}
              onChange={(e) => setCaseSlug(e.target.value)}
              placeholder="예: hwaseong-serial-murders"
              pattern="[a-z0-9\-]*"
              maxLength={200}
              className="w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm outline-none focus:border-foreground/50"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium">내용</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            minLength={5}
            maxLength={MAX}
            rows={7}
            placeholder={
              kind === "CORRECTION"
                ? "어느 부분이 어떻게 다른지, 확인할 수 있는 기사나 자료가 있다면 함께 알려 주세요."
                : "자유롭게 적어 주세요. 이름, 연락처 같은 개인정보는 적지 말아 주세요."
            }
            className="w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm outline-none focus:border-foreground/50"
          />
          <span className="mt-1 block text-right text-xs text-subtle">
            {body.length}/{MAX}
          </span>
        </label>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-[#2f7a70]" : "text-[#b5543a]"}`}>
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || body.trim().length < 5}
          className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-surface disabled:opacity-50"
        >
          {pending ? "보내는 중…" : "보내기"}
        </button>
      </form>

      {mine.length > 0 && (
        <section className="mt-10" aria-labelledby="mine-title">
          <h2 id="mine-title" className="text-lg font-semibold">
            내가 보낸 글
          </h2>
          <p className="text-xs text-subtle">이 브라우저에서 보낸 글만 보입니다.</p>
          <ul className="mt-4 space-y-3">
            {mine.map((q) => (
              <MyInquiryItem key={q.id} item={q} onChange={setMine} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

async function call(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: body === undefined ? "POST" : "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string | string[]; mine?: MyInquiry[] };
  if (!res.ok) throw new Error(typeof data.message === "string" ? data.message : "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  return data.mine ?? [];
}

/** 내가 보낸 글 한 장: 관리자가 보기 전이면 고치기, 언제든 지우기 */
function MyInquiryItem({ item: q, onChange }: { item: MyInquiry; onChange: (mine: MyInquiry[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(q.body);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (task: () => Promise<MyInquiry[]>) => {
    setPending(true);
    setError(null);
    try {
      onChange(await task());
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <li className="rounded-xl border border-line bg-surface p-4 text-sm">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="font-medium">{KIND_LABEL[q.kind]}</span>
        <span>· {q.reply ? "답변이 왔습니다" : q.editable ? "관리자가 아직 보지 않았습니다" : STATUS_LABEL[q.status]}</span>
        <span className="ml-auto">{dateFmt.format(new Date(q.createdAt))}</span>
      </div>
      {editing ? (
        <div className="mt-2">
          <textarea
            value={draft}
            maxLength={MAX}
            rows={4}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full resize-y rounded-lg border border-line bg-background p-3 text-sm leading-6 outline-none focus-visible:ring-4 focus-visible:ring-[#4f78a8]/20"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setDraft(q.body); }} className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-black/5">
              취소
            </button>
            <button
              type="button"
              disabled={pending || draft.trim().length < 5}
              onClick={() => run(() => call(`/api/inquiries/${q.id}`, { body: draft }))}
              className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-surface disabled:opacity-50"
            >
              {pending ? "저장 중입니다" : "수정하기"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap break-words">{q.body}</p>
      )}
      {q.reply && (
        <div className="mt-3 rounded-lg bg-[#4f78a8]/8 p-3">
          <p className="text-xs font-semibold text-[#4f78a8]">답변</p>
          <p className="mt-1 whitespace-pre-wrap text-muted">{q.reply}</p>
        </div>
      )}
      {!editing && (
        <div className="mt-3 flex justify-end gap-3 text-xs text-subtle">
          {q.editable && (
            <button type="button" onClick={() => setEditing(true)} className="hover:text-foreground">
              수정
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("보낸 글을 지울까요? 지우면 되돌릴 수 없습니다.")) {
                void run(() => call(`/api/inquiries/${q.id}/delete`));
              }
            }}
            className="hover:text-[#b5543a]"
          >
            삭제
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-[#b5543a]">{error}</p>}
    </li>
  );
}
