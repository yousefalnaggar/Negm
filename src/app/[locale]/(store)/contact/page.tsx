import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentPage } from "@/components/content-page";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.contact");
  return { title: t("title") };
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  setRequestLocale((await params).locale as "ar" | "en");
  const [t, settings] = await Promise.all([getTranslations("pages.contact"), getSettings()]);
  return (
    <ContentPage title={t("title")} lead={t("lead")}>
      <dl className="grid gap-8 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">{t("phone")}</dt>
          <dd className="mt-1 font-semibold">
            <a href={`tel:${settings.phone}`} dir="ltr" className="hover:text-accent">{settings.phone}</a>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("hours")}</dt>
          <dd className="mt-1 font-semibold">{t("hoursText")}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("address")}</dt>
          <dd className="mt-1 font-semibold">{t("addressText")}</dd>
        </div>
      </dl>
    </ContentPage>
  );
}
