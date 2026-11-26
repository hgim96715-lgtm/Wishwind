"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LuFlag, LuHeart, LuLock, LuNotebookPen, LuSearch, LuTrash2 } from "react-icons/lu";
import type {
  CaseNoteAnswer,
  CaseNoteSaveResult,
  CaseNotesState,
  UnsolvedQuestion,
  UserContentStatus,
} from "@/lib/cases/types";

interface PollsState {
  choices: string[];
  polls: { questionId: string; myChoice: number | null; votes: number[] | null }[];
}

const ANSWER_MAX = 500;
const QUESTION_MAX = 200;

const STATUS_NOTICE: Partial<Record<UserContentStatus, string>> = {
  HELD: "확인이 필요한 글이라 검토 후 공개됩니다.",
  BLOCKED: "공개되지 않은 글입니다. 내용을 고쳐 다시 남길 수 있습니다.",
  HIDDEN: "신고가 누적되어 숨겨진 글입니다.",
};

async function send<T>(path: string, method: "PUT" | "POST", body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json()) as T & { message?: string | string[] };
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
    );
  }
  return data;
}

/** 로그인 없이 고르는 객관식 의견. 고르기 전에는 득표를 숨기고, 고르면 비율을 보여 줌 */
function PollBox({
  choices,
  poll,
  onVote,
}: {
  choices: string[];
  poll: PollsState["polls"][number];
  onVote: (choice: number) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const total = poll.votes?.reduce((n, v) => n + v, 0) ?? 0;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-muted">가장 가까운 생각을 하나 골라 주세요</p>
      <ul className="mt-2 space-y-1.5">
        {choices.map((label, i) => {
          const count = poll.votes?.[i] ?? 0;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          const mine = poll.myChoice === i;
          return (
            <li key={label}>
              <button
                type="button"
                disabled={poll.myChoice !== null || pending}
                aria-pressed={mine}
                onClick={() => {
                  setPending(true);
                  onVote(i).finally(() => setPending(false));
                }}
                className={`relative flex min-h-10 w-full items-center justify-between gap-3 overflow-hidden rounded-lg border px-3 text-left text-sm transition-colors enabled:hover:border-[#c46a4b]/60 disabled:cursor-default ${
                  mine ? "border-[#c46a4b] font-semibold" : "border-line"
                } bg-surface`}
              >
                {poll.votes && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-[#c46a4b]/15"
                    style={{ width: `${percent}%` }}
                  />
                )}
                <span className="relative">{label}</span>
                {poll.votes && <span className="relative text-xs tabular-nums text-muted">{percent}%</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {poll.votes && (
        <p className="mt-1.5 text-[11px] text-subtle">{total.toLocaleString("ko-KR")}명이 참여했습니다.</p>
      )}
    </div>
  );
}

function ReportButton({ onReport }: { onReport: () => Promise<void> }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={done}
      onClick={() => onReport().then(() => setDone(true))}
      className="inline-flex min-h-8 items-center gap-1 text-xs text-subtle hover:text-[#c46a4b] disabled:cursor-default"
    >
      <LuFlag aria-hidden className="size-3" />
      {done ? "신고했습니다" : "신고"}
    </button>
  );
}

/** 다른 사람 노트 한 장. 댓글은 없고, 공감해요와 신고만 */
function OtherNote({
  note,
  onEmpathy,
  onReport,
}: {
  note: CaseNoteAnswer;
  onEmpathy: () => Promise<void>;
  onReport: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  return (
    <li className="rounded-lg bg-background p-3 text-sm leading-6">
      <p className="text-xs font-semibold text-subtle">{note.nickname}</p>
      <p className="mt-1 break-words whitespace-pre-wrap">{note.body}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-pressed={note.empathizedByMe}
          disabled={note.empathizedByMe || pending}
          onClick={() => {
            setPending(true);
            onEmpathy().finally(() => setPending(false));
          }}
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line px-3 text-xs font-semibold text-muted enabled:hover:border-[#c46a4b]/60 enabled:hover:text-[#c46a4b] disabled:cursor-default aria-pressed:border-[#c46a4b]/40 aria-pressed:text-[#c46a4b]"
        >
          <LuHeart aria-hidden className={`size-3.5 ${note.empathizedByMe ? "fill-current" : ""}`} />
          공감해요
          {note.empathyCount > 0 && <span className="font-normal tabular-nums">{note.empathyCount.toLocaleString("ko-KR")}</span>}
        </button>
        <ReportButton onReport={onReport} />
      </div>
    </li>
  );
}

function NoteForm({
  label,
  guide,
  placeholder,
  submitLabel,
  max,
  initial,
  onSubmit,
  onDelete,
}: {
  label: string;
  /** 쓰는 칸 위의 안내 한 줄 */
  guide?: string;
  placeholder: string;
  submitLabel: string;
  max: number;
  initial: string;
  onSubmit: (body: string) => Promise<string>;
  /** 내가 이미 남긴 노트일 때만: 지우기 */
  onDelete?: () => Promise<void>;
}) {
  const [body, setBody] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      setMessage(await onSubmit(body));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "처리하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3">
      <label className="text-sm font-semibold">
        {label}
        {guide && <span className="mt-1 block text-xs font-normal leading-5 text-muted">{guide}</span>}
        <textarea
          value={body}
          maxLength={max}
          rows={3}
          placeholder={placeholder}
          onChange={(e) => setBody(e.target.value)}
          className="mt-2 w-full resize-y rounded-lg border border-line bg-background p-3 text-base font-normal leading-6 outline-none focus-visible:ring-4 focus-visible:ring-[#c46a4b]/25"
        />
      </label>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-xs text-subtle">
          {body.length}/{max}
        </span>
        <span className="flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                if (!window.confirm("내 노트를 지울까요? 받은 공감도 함께 사라지고, 다른 사람의 노트는 다시 가려집니다.")) return;
                setPending(true);
                setMessage(null);
                try {
                  await onDelete();
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "지우지 못했습니다.");
                  setPending(false);
                }
              }}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-line px-3 text-sm text-muted hover:border-[#c46a4b]/60 hover:text-[#c46a4b] disabled:opacity-50"
            >
              <LuTrash2 aria-hidden className="size-4" />
              지우기
            </button>
          )}
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#c46a4b] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LuNotebookPen aria-hidden className="size-4" />
          {pending ? "검토 중입니다" : submitLabel}
        </button>
        </span>
      </div>
      <p aria-live="polite" className="mt-2 text-sm text-[#c46a4b] empty:hidden">
        {message}
      </p>
    </form>
  );
}

/** 질문 목록과 수사 노트. 내 노트를 남긴 뒤에만 다른 사람의 노트를 보여 줌 */
export function CaseNotes({
  slug,
  solved,
  questions,
  readOnly = false,
}: {
  slug: string;
  solved: boolean;
  questions: UnsolvedQuestion[];
  /** 공개 전 미리보기에서는 수사 노트를 받지 않음 */
  readOnly?: boolean;
}) {
  const [notes, setNotes] = useState<CaseNotesState | null>(null);
  const [failed, setFailed] = useState(false);
  const [polls, setPolls] = useState<PollsState | null>(null);
  const base = `/api/case-notes/${encodeURIComponent(slug)}`;

  useEffect(() => {
    if (readOnly) return;
    const controller = new AbortController();
    fetch(base, { signal: controller.signal, cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`수사 노트 조회 실패 ${res.status}`);
        return res.json() as Promise<CaseNotesState>;
      })
      .then(setNotes)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    if (!solved) {
      fetch(`${base}/polls`, { signal: controller.signal, cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<PollsState>) : null))
        .then((data) => data && setPolls(data))
        .catch(() => null);
    }
    return () => controller.abort();
  }, [base, readOnly, solved]);

  const votePoll = async (questionId: string, choice: number) => {
    try {
      setPolls(await send<PollsState>(`${base}/polls/${questionId}`, "PUT", { choice }));
    } catch {
      // 이미 투표했거나 차단된 경우 조용히 무시
    }
  };

  const save = async (path: string, method: "PUT" | "POST", body: string) => {
    const saved = await send<CaseNoteSaveResult>(`${base}${path}`, method, { body });
    setNotes(saved.notes);
    return saved.result.message;
  };
  const removeAnswer = async (questionId: string) => {
    setNotes(await send<CaseNotesState>(`${base}/answers/${questionId}/delete`, "POST"));
  };
  const report = async (target: "answer" | "question", id: string) => {
    await send(`${base}/reports`, "POST", { target, id });
  };
  const curious = async (id: string) => {
    setNotes(await send<CaseNotesState>(`${base}/questions/${id}/curious`, "PUT"));
  };
  const empathy = async (answerId: string) => {
    try {
      setNotes(await send<CaseNotesState>(`${base}/answers/${answerId}/empathy`, "PUT"));
    } catch {
      // 이미 눌렀거나 숨겨진 글이면 조용히 무시
    }
  };

  if (questions.length === 0 && !notes?.canAsk) {
    return (
      <p className="py-10 text-center text-sm text-subtle">
        {solved ? "정리된 생각해볼 점이 아직 없습니다." : "남은 질문이 없습니다."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {solved && (
        <p className="text-sm text-subtle">수사·재판은 끝났지만, 함께 돌아볼 이야기입니다.</p>
      )}
      {readOnly && (
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-subtle">
          아직 검토 중인 사건이라 수사 노트를 받지 않습니다. 사건이 공개되면 답변을 남길 수 있습니다.
        </p>
      )}
      {failed && (
        <p role="alert" className="text-sm text-[#c46a4b]">
          수사 노트를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
      <ul className="space-y-3">
        {questions.map((q) => {
          const note = notes?.questions.find((n) => n.questionId === q.id);
          const others = note?.answers.filter((a) => !a.isMine) ?? [];
          const hiddenCount = note && !note.unlocked ? Math.max(0, note.answerCount - others.length) : 0;
          return (
            <li
              key={q.id}
              className="rounded-xl border-2 border-dashed border-[#c46a4b]/35 bg-[#c46a4b]/5 p-4"
            >
              <p className="font-semibold">
                <span className="mr-1.5 font-mono text-[#c46a4b]">Q.</span>
                {q.question}
              </p>
              {q.description && <p className="mt-1 text-sm leading-6 text-muted">{q.description}</p>}
              {q.isResolved && q.answer && (
                <p className="mt-2 text-sm leading-6">
                  <span className="mr-1.5 font-mono font-semibold text-[#3f8f84]">A.</span>
                  {q.answer}
                </p>
              )}
              {!readOnly && polls?.polls.find((p) => p.questionId === q.id) && (
                <PollBox
                  choices={polls.choices}
                  poll={polls.polls.find((p) => p.questionId === q.id)!}
                  onVote={(choice) => votePoll(q.id, choice)}
                />
              )}
              {note && (
                <div className="mt-3 border-t border-[#c46a4b]/25 pt-1">
                  {note.mine && STATUS_NOTICE[note.mine.status] && (
                    <p className="mt-2 text-sm text-[#c46a4b]">{STATUS_NOTICE[note.mine.status]}</p>
                  )}
                  {note.mine?.status !== "HIDDEN" && (
                    <NoteForm
                      key={note.mine?.body ?? "new"}
                      label={note.mine ? "내 수사 노트" : "내 생각 남기기 (선택)"}
                      guide="한 줄만 남겨도 괜찮습니다 (선택). 누군가를 탓하기보다, 같은 일을 막으려면 무엇이 필요할지 적어 주세요."
                      placeholder="이 질문에 대한 내 생각을 적어 주세요. 특정인을 범인으로 단정하는 글은 남길 수 없습니다."
                      submitLabel={note.mine ? "노트 수정하기" : "수사 노트 남기기"}
                      max={ANSWER_MAX}
                      initial={note.mine?.body ?? ""}
                      onSubmit={async (body) => {
                        const received = note.mine?.empathyCount ?? 0;
                        if (
                          received > 0 &&
                          body.trim() !== note.mine?.body &&
                          !window.confirm(`노트를 수정하면 받은 공감 ${received.toLocaleString("ko-KR")}개가 사라집니다. 수정할까요?`)
                        ) {
                          return "수정하지 않았습니다.";
                        }
                        return save(`/answers/${q.id}`, "PUT", body);
                      }}
                      onDelete={note.mine ? () => removeAnswer(q.id) : undefined}
                    />
                  )}
                  {note.mine && note.mine.status === "PUBLISHED" && note.mine.empathyCount > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#c46a4b]">
                      <LuHeart aria-hidden className="size-3.5 fill-current" />
                      {note.mine.empathyCount.toLocaleString("ko-KR")}명이 내 노트에 공감했습니다.
                    </p>
                  )}
                  {others.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {others.map((a) => (
                        <OtherNote
                          key={a.id}
                          note={a}
                          onEmpathy={() => empathy(a.id)}
                          onReport={() => report("answer", a.id)}
                        />
                      ))}
                    </ul>
                  )}
                  {!note.unlocked && note.answerCount > 0 && (
                    <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-xs leading-5 text-muted">
                      <LuLock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        다른 사람의 의견을 보기 전에, 곰곰이 한번 생각해 보세요. 내 노트를 남기면
                        {hiddenCount > 0 ? ` 다른 사람의 노트 ${hiddenCount.toLocaleString("ko-KR")}개가` : " 다른 사람의 노트가"} 열립니다.
                      </span>
                    </p>
                  )}
                  {note.unlocked && others.length > 0 && (
                    <p className="mt-2 text-[11px] text-subtle">
                      노트에는 댓글을 달 수 없습니다. 생각이 다르면 내 노트로 남겨 주세요.
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {notes?.canAsk && (
        <section aria-label="수사관들의 질문" className="rounded-xl border border-line bg-surface p-4">
          <h3 className="flex items-center gap-1.5 font-semibold">
            <LuSearch aria-hidden className="size-4 text-[#c46a4b]" />
            수사관들의 질문
          </h3>
          {notes.userQuestions.length > 0 && (
            <ul className="mt-3 space-y-2">
              {notes.userQuestions.map((q) => (
                <li key={q.id} className="rounded-lg bg-background p-3 text-sm leading-6">
                  <p className="break-words whitespace-pre-wrap">{q.body}</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      aria-pressed={q.curiousByMe}
                      disabled={q.curiousByMe || q.isMine}
                      onClick={() => curious(q.id)}
                      className="min-h-8 rounded-full border border-line px-3 text-xs font-semibold text-muted enabled:hover:border-[#c46a4b]/60 enabled:hover:text-[#c46a4b] disabled:cursor-default"
                    >
                      나도 궁금합니다 {q.curiousCount.toLocaleString("ko-KR")}
                    </button>
                    {!q.isMine && <ReportButton onReport={() => report("question", q.id)} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {notes.myQuestion?.status === "PUBLISHED" ? (
            <p className="mt-3 text-xs text-subtle">질문은 사건마다 하나만 남길 수 있습니다.</p>
          ) : notes.myQuestion?.status === "HIDDEN" ? (
            <p className="mt-3 text-sm text-[#c46a4b]">{STATUS_NOTICE.HIDDEN}</p>
          ) : (
            <>
              {notes.myQuestion && (
                <p className="mt-3 text-sm text-[#c46a4b]">{STATUS_NOTICE[notes.myQuestion.status]}</p>
              )}
              <NoteForm
                key={notes.myQuestion?.body ?? "new-question"}
                label="궁금한 점 추가하기"
                placeholder="이 사건에서 더 밝혀졌으면 하는 점을 질문으로 남겨 주세요."
                submitLabel="질문 남기기"
                max={QUESTION_MAX}
                initial={notes.myQuestion?.body ?? ""}
                onSubmit={(body) => save("/questions", "POST", body)}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}
