import type { ReactNode } from "react";

export function Badge({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ color, borderColor: `${color}66`, backgroundColor: `${color}12` }}
    >
      {children}
    </span>
  );
}

export function PageTitle({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-5 ${className}`}>{children}</section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-subtle">{children}</p>;
}

export function Skeleton() {
  return (
    <div className="space-y-3" aria-busy>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-line/50" />
      ))}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg border border-brand/40 bg-brand/5 px-4 py-3 text-sm text-clay-ink">
      {message}
    </p>
  );
}

/** admin-input: select 화살표와 날짜 달력 버튼을 같은 오른쪽 위치에 맞춤 (globals.css) */
export const inputClass =
  "admin-input w-full rounded-md border border-line bg-white/60 px-3 py-2 text-sm outline-none focus:border-foreground/50";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-subtle">{hint}</span>}
    </label>
  );
}

/** 상단 탭 형태 필터 링크 */
export function FilterTabs({
  items,
  current,
}: {
  items: { href: string; label: string; key: string; count?: number }[];
  current: string;
}) {
  return (
    <nav className="mb-5 flex flex-wrap gap-2">
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          aria-current={item.key === current ? "page" : undefined}
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
            item.key === current
              ? "border-foreground bg-foreground text-surface"
              : "border-line bg-surface text-muted hover:border-foreground/40"
          }`}
        >
          {item.label}
          {item.count !== undefined && <span className="ml-1 opacity-70">{item.count}</span>}
        </a>
      ))}
    </nav>
  );
}
