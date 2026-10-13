import { formatPrice } from "@/lib/money";

export function Price({
  amount,
  compareAt,
  locale,
  className = "",
}: {
  amount: number;
  compareAt?: number | null;
  locale: string;
  className?: string;
}) {
  const onSale = compareAt != null && compareAt > amount;
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className={onSale ? "text-accent" : undefined}>{formatPrice(amount, locale)}</span>
      {onSale && <s className="text-[0.85em] font-normal text-muted">{formatPrice(compareAt, locale)}</s>}
    </span>
  );
}
