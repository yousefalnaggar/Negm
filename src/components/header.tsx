import { MessageCircle, ShoppingBag } from "lucide-react";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCartCount } from "@/lib/cart";
import { getCategories } from "@/lib/catalog";
import { localName } from "@/lib/localized";
import { whatsappUrl } from "@/lib/normalize";
import { getSettings } from "@/lib/settings";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";
import { SearchDialog } from "./search-dialog";
import { ThemeToggle } from "./theme-toggle";

export async function Header() {
  const [locale, t, tHome, settings, count, categories] = await Promise.all([
    getLocale(),
    getTranslations("nav"),
    getTranslations("home"),
    getSettings(),
    getCartCount(),
    getCategories(),
  ]);
  const storeName = locale === "ar" ? settings.storeNameAr : settings.storeNameEn;
  const links = [
    { href: "/", label: t("home") },
    { href: "/shop", label: t("products") },
    { href: "/services", label: t("services") },
    { href: "/about", label: t("about") },
  ];
  const whatsapp = whatsappUrl(settings.phone);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="bg-ink py-1.5 text-center text-xs text-bg dark:border-b dark:border-line dark:bg-sunken dark:text-muted">
        <span className="me-2 inline-block size-1.5 rounded-full bg-pop align-middle" />
        {tHome("promises.cod")} · {tHome("promises.delivery")}
      </div>
      <div className="container-page flex h-16 items-center gap-1.5 sm:gap-4">
        <MobileMenu links={links} whatsapp={{ href: whatsapp, label: t("contactWhatsapp") }} />

        <Link href="/" className="group flex min-w-0 items-center gap-1.5 font-display text-lg font-extrabold tracking-tight text-ink min-[360px]:gap-2 min-[360px]:text-xl sm:text-2xl">
          <span className="size-3 shrink-0 rotate-45 rounded-[3px] bg-accent transition-transform duration-500 group-hover:rotate-[225deg]" />
          <span className="truncate">{storeName}</span>
        </Link>

        <nav className="ms-6 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="relative rounded-full px-3 py-2 text-sm font-semibold text-ink transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-300 hover:text-accent hover:after:scale-x-100 rtl:after:origin-right">
              {l.label}
            </Link>
          ))}
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="ms-1 inline-flex items-center gap-1.5 rounded-full bg-[#25d366]/12 px-3.5 py-2 text-sm font-semibold text-[#128c4a] hover:bg-[#25d366]/20 dark:text-[#4ade80]"
          >
            <MessageCircle className="size-4" strokeWidth={2} />
            {t("contactWhatsapp")}
          </a>
        </nav>

        <div className="ms-auto flex shrink-0 items-center sm:gap-0.5">
          <SearchDialog categories={categories.map((c) => ({ slug: c.slug, name: localName(c, locale) }))} />
          <Suspense>
            <LanguageSwitcher />
          </Suspense>
          <ThemeToggle />
          <Link
            href="/cart"
            className="relative grid size-9 place-items-center rounded-full text-ink hover:bg-sunken sm:size-10"
            aria-label={`${t("cart")} (${count})`}
          >
            <ShoppingBag className="size-[18px]" strokeWidth={1.75} />
            {count > 0 && (
              <span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] leading-5 font-bold text-on-accent">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
