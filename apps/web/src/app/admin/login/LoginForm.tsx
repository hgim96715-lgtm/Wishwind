"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="mt-6 space-y-3">
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        required
        aria-label="관리자 비밀번호"
        className="w-full rounded-md border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-foreground/50"
      />
      {state.error && (
        <p role="alert" className="text-sm text-clay-ink">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-surface disabled:opacity-60"
      >
        {pending ? "확인 중…" : "들어가기"}
      </button>
    </form>
  );
}
