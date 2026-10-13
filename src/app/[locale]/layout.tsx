import type { Metadata } from "next";
import { Alexandria, Bricolage_Grotesque, Manrope, Tajawal } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { routing } from "@/i18n/routing";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import "../globals.css";

// No metric fallback for the Latin fonts: Arial includes Arabic glyphs and would
// shadow Tajawal/Alexandria for Arabic text inside English pages (e.g. admin forms).
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap", adjustFontFallback: false });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap", adjustFontFallback: false });
const alexandria = Alexandria({ subsets: ["arabic"], variable: "--font-alexandria", display: "swap" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"], variable: "--font-tajawal", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "ar" | "en", namespace: "meta" });
  const s = await getSettings();
  const name = locale === "ar" ? s.storeNameAr : s.storeNameEn;
  return {
    metadataBase: new URL(env.SITE_URL),
    title: { default: name, template: `%s · ${name}` },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${manrope.variable} ${bricolage.variable} ${tajawal.variable} ${alexandria.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <ThemeProvider>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
