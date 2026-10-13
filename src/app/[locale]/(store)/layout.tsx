import { getTranslations } from "next-intl/server";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("nav");
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-bg">
        {t("skip")}
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
