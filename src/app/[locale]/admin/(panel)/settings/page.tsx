import { getTranslations, setRequestLocale } from "next-intl/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export default async function SettingsPage({ params }: PageProps<"/[locale]/admin/settings">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  await requireAdmin();
  const [tAdmin, s] = await Promise.all([getTranslations("admin"), getSettings()]);
  return (
    <>
      <PageHeader title={tAdmin("settings")} />
      <SettingsForm initial={{ storeNameAr: s.storeNameAr, storeNameEn: s.storeNameEn, phone: s.phone, shippingFee: String(s.shippingFee / 100) }} />
    </>
  );
}
