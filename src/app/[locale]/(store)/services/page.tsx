import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentPage } from "@/components/content-page";
import { whatsappUrl } from "@/lib/normalize";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.services");
  return { title: t("title") };
}

export default async function ServicesPage({ params }: PageProps<"/[locale]/services">) {
  setRequestLocale((await params).locale as "ar" | "en");
  const [t, settings] = await Promise.all([getTranslations("pages.services"), getSettings()]);
  const items = t.raw("items") as { title: string; text: string }[];
  return (
    <ContentPage title={t("title")} lead={t("lead")}>
      <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {items.map((item, i) => (
          <li key={item.title} className="flex gap-4">
            <span className="w-9 shrink-0 font-display text-2xl text-accent tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-1 text-muted">{item.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <a href={whatsappUrl(settings.phone)} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 px-6 py-3">
        <MessageCircle className="size-4" strokeWidth={2} />
        {t("cta")}
      </a>
    </ContentPage>
  );
}
