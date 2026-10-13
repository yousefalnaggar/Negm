import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentPage } from "@/components/content-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.shipping");
  return { title: t("title") };
}

export default async function ShippingPage({ params }: PageProps<"/[locale]/shipping">) {
  setRequestLocale((await params).locale as "ar" | "en");
  const t = await getTranslations("pages.shipping");
  const sections = t.raw("sections") as { title: string; text: string }[];
  return (
    <ContentPage title={t("title")} lead={t("lead")}>
      {sections.map((s) => (
        <section key={s.title}>
          <h2 className="font-semibold">{s.title}</h2>
          <p className="mt-2 text-muted">{s.text}</p>
        </section>
      ))}
    </ContentPage>
  );
}
