"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

/** `labelClassName` can hide the text at some widths (it stays for screen readers and as a tooltip). */
export function DeleteButton({
  label,
  confirmText,
  onDelete,
  labelClassName = "",
}: {
  label: string;
  confirmText: string;
  onDelete: () => Promise<unknown>;
  labelClassName?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm(confirmText) && start(async () => void (await onDelete()))}
      className="btn-ghost text-danger"
      title={label}
    >
      <Trash2 className="size-4" /> <span className={labelClassName}>{label}</span>
    </button>
  );
}
