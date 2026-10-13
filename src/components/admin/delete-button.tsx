"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

export function DeleteButton({ label, confirmText, onDelete }: { label: string; confirmText: string; onDelete: () => Promise<unknown> }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm(confirmText) && start(async () => void (await onDelete()))}
      className="btn-ghost text-danger"
    >
      <Trash2 className="size-4" /> {label}
    </button>
  );
}
