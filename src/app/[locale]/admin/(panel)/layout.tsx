import { ExternalLink, LogOut } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { logout } from "@/actions/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const [locale, t, settings, newOrders] = await Promise.all([
    getLocale(),
    getTranslations("admin"),
    getSettings(),
    db.order.count({ where: { status: "NEW" } }),
  ]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="no-print border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-e lg:border-b-0">
        <div className="flex items-center justify-between gap-2 px-4 py-4 lg:px-5 lg:py-6">
          <div>
            <p className="font-display text-xl font-semibold">{locale === "ar" ? settings.storeNameAr : settings.storeNameEn}</p>
            <p className="text-xs text-muted">{t("title")}</p>
          </div>
          <div className="flex items-center lg:hidden">
            <ThemeToggle />
          </div>
        </div>
        <div className="px-3 pb-3 lg:flex-1">
          <AdminNav newOrders={newOrders} />
        </div>
        <div className="hidden space-y-1 border-t border-line p-3 lg:block">
          <p className="truncate px-3 pb-2 text-xs text-muted" dir="ltr">{session.user.email}</p>
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-sunken hover:text-ink">
            <ExternalLink className="size-4" strokeWidth={1.75} /> {t("viewStore")}
          </Link>
          <form action={logout}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-sunken hover:text-ink">
              <LogOut className="size-4 rtl:-scale-x-100" strokeWidth={1.75} /> {t("signOut")}
            </button>
          </form>
          <div className="flex items-center justify-between px-1 pt-1">
            <Suspense><LanguageSwitcher /></Suspense>
            <ThemeToggle />
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">
        {children}
        <div className="no-print mt-12 flex items-center justify-between border-t border-line pt-4 lg:hidden">
          <Suspense><LanguageSwitcher /></Suspense>
          <form action={logout}>
            <button type="submit" className="btn-ghost">{t("signOut")}</button>
          </form>
        </div>
      </main>
    </div>
  );
}
