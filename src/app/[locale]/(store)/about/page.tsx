import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentPage } from "@/components/content-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.about");
  return { title: t("title") };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  setRequestLocale((await params).locale as "ar" | "en");
  const t = await getTranslations("pages.about");
  return (
    <ContentPage title={t("title")} lead={t("lead")}>
      {(t.raw("body") as string[]).map((p) => (
        <p key={p}>{p}</p>
      ))}
    </ContentPage>
  );
}
