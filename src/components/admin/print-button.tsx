"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-dark">
      <Printer className="size-4" /> {label}
    </button>
  );
}
