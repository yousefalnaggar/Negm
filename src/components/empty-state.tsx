export function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
      <p className="font-display text-2xl">{title}</p>
      {hint && <p className="mt-2 text-muted">{hint}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
