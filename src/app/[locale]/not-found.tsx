import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const [t, tNav] = await Promise.all([getTranslations("errors"), getTranslations("nav")]);
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="font-display text-7xl text-accent">404</p>
        <h1 className="mt-4 font-display text-3xl font-bold">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-muted">{t("notFoundText")}</p>
        <Link href="/" className="btn-primary mt-8">{tNav("home")}</Link>
      </div>
    </main>
  );
}
