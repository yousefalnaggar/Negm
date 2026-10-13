"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const FLAGS = { en: { src: "/flags/gb.svg", code: "EN" }, ar: { src: "/flags/eg.svg", code: "AR" } };

/** Links to the same page in the other language, keeping the query string. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const t = useTranslations("nav");
  const other = locale === "ar" ? "en" : "ar";
  return (
    <Link
      href={search ? `${pathname}?${search}` : pathname}
      locale={other}
      lang={other}
      title={t("switchLanguage")}
      className={`inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-bold text-ink transition-colors hover:bg-sunken ${className}`}
    >
      <img src={FLAGS[other].src} alt="" width={20} height={14} className="h-3.5 w-5 rounded-[3px] object-cover ring-1 ring-black/10" />
      {FLAGS[other].code}
    </Link>
  );
}
