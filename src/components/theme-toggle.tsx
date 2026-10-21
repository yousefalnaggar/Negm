"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("nav");
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={`grid size-9 place-items-center sm:size-10 rounded-full text-ink transition-colors hover:bg-sunken ${className}`}
      aria-label={t("toggleTheme")}
      title={t("toggleTheme")}
    >
      {/* Both icons render; CSS picks one, so there is no hydration flash. */}
      <Moon className="size-[18px] dark:hidden" strokeWidth={1.75} />
      <Sun className="hidden size-[18px] dark:block" strokeWidth={1.75} />
    </button>
  );
}
