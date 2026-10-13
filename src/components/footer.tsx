import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/catalog";
import { localName } from "@/lib/localized";
import { getSettings } from "@/lib/settings";

export async function Footer() {
  const [locale, t, tNav, categories, settings] = await Promise.all([
    getLocale(),
    getTranslations("footer"),
    getTranslations("nav"),
    getCategories(),
    getSettings(),
  ]);
  const storeName = locale === "ar" ? settings.storeNameAr : settings.storeNameEn;

  return (
    <footer className="mt-24 border-t border-line bg-sunken/60">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="font-display text-3xl font-semibold">{storeName}</p>
          <p className="mt-2 max-w-xs text-muted">{t("tagline")}</p>
          {settings.phone && (
            <p className="mt-6 text-sm">
              <a href={`tel:${settings.phone}`} dir="ltr" className="font-medium hover:text-accent">
                {settings.phone}
              </a>
            </p>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">{t("shop")}</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/shop?category=${c.slug}`} className="hover:text-ink">
                  {localName(c, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">{t("help")}</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/services" className="hover:text-ink">{tNav("services")}</Link></li>
            <li><Link href="/about" className="hover:text-ink">{tNav("about")}</Link></li>
            <li><Link href="/shipping" className="hover:text-ink">{tNav("shipping")}</Link></li>
            <li><Link href="/contact" className="hover:text-ink">{tNav("contact")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="container-page border-t border-line py-6 text-xs text-muted">
        © {new Date().getFullYear()} {storeName}. {t("rights")}
      </div>
    </footer>
  );
}
