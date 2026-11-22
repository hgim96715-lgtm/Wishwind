import Link from "next/link";

export function AnalyticsTabs({ current }: { current: "traffic" | "engagement" }) {
  const tabs = [
    { key: "traffic" as const, label: "방문 흐름", href: "/admin/analytics" },
    { key: "engagement" as const, label: "참여 분석", href: "/admin/analytics/engagement" },
  ];

  return (
    <nav aria-label="방문자 분석 종류" className="mb-5 grid grid-cols-2 rounded-lg border border-line bg-surface p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === current ? "page" : undefined}
          className={`rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
            tab.key === current ? "bg-foreground text-surface shadow-sm" : "text-muted hover:bg-background hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
