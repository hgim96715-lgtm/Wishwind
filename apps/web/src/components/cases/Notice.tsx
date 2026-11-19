export function Notice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/70 px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted [&_code]:rounded [&_code]:bg-line/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs">
        {children}
      </p>
    </div>
  );
}
