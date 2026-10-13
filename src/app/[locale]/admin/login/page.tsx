import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/admin/login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { redirect } from "@/i18n/navigation";
import { getAdminSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { robots: { index: false } };

export default async function LoginPage({ params }: PageProps<"/[locale]/admin/login">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  if (await getAdminSession()) redirect({ href: "/admin", locale: locale as "ar" | "en" });
  const [t, settings] = await Promise.all([getTranslations("admin.login"), getSettings()]);

  return (
    <main className="grid min-h-dvh place-items-center bg-sunken px-4">
      <div className="absolute end-4 top-4 flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <p className="text-center font-display text-3xl font-semibold">
          {locale === "ar" ? settings.storeNameAr : settings.storeNameEn}
        </p>
        <div className="card mt-6 p-6 sm:p-8">
          <h1 className="mb-6 text-lg font-semibold">{t("title")}</h1>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
