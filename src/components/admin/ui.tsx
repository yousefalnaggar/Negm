import { useTranslations } from "next-intl";
import type { OrderStatus } from "@/generated/prisma/client";

const STATUS_STYLES: Record<OrderStatus, string> = {
  NEW: "bg-accent text-on-accent",
  CONFIRMED: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  SHIPPED: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  DELIVERED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-sunken text-muted line-through",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations("status");
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[status]}`}>
      {t(status)}
    </span>
  );
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
