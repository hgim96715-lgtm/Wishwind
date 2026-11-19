"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/admin/types";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

/**
 * 서버 함수를 부르는 폼. 처리 중에는 입력을 잠그고, 결과 문구를 폼 아래에 보여 줌.
 * confirmMessage가 있으면 되돌리기 어려운 작업 전에 한 번 더 물어봄
 */
export function ActionForm({
  action,
  children,
  className,
  confirmMessage,
  inline = false,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
  inline?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={
        confirmMessage
          ? (e) => {
              if (!window.confirm(confirmMessage)) e.preventDefault();
            }
          : undefined
      }
    >
      <fieldset disabled={pending} className={inline ? "contents" : "space-y-3"}>
        {children}
      </fieldset>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-[#b5543a]">
          {state.error}
        </p>
      )}
      {state.ok && !state.error && (
        <p role="status" className="mt-2 text-sm text-[#2f7a70]">
          {state.ok}
        </p>
      )}
    </form>
  );
}

const TONE = {
  primary: "bg-foreground text-surface hover:bg-foreground/85",
  plain: "border border-line bg-surface hover:border-foreground/40",
  danger: "border border-[#c46a4b]/50 text-[#b5543a] bg-surface hover:bg-[#c46a4b]/10",
  ok: "border border-[#3f8f84]/50 text-[#2f7a70] bg-surface hover:bg-[#3f8f84]/10",
} as const;

export function Button({
  children,
  tone = "plain",
  name,
  value,
}: {
  children: ReactNode;
  tone?: keyof typeof TONE;
  name?: string;
  value?: string;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-50 ${TONE[tone]}`}
    >
      {children}
    </button>
  );
}
