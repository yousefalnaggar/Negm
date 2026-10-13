export const GOVERNORATES = [
  { code: "CAI", ar: "القاهرة", en: "Cairo" },
  { code: "GIZ", ar: "الجيزة", en: "Giza" },
  { code: "ALX", ar: "الإسكندرية", en: "Alexandria" },
  { code: "QAL", ar: "القليوبية", en: "Qalyubia" },
  { code: "SHR", ar: "الشرقية", en: "Sharqia" },
  { code: "DAK", ar: "الدقهلية", en: "Dakahlia" },
  { code: "GHA", ar: "الغربية", en: "Gharbia" },
  { code: "MNF", ar: "المنوفية", en: "Monufia" },
  { code: "BEH", ar: "البحيرة", en: "Beheira" },
  { code: "KFS", ar: "كفر الشيخ", en: "Kafr El Sheikh" },
  { code: "DAM", ar: "دمياط", en: "Damietta" },
  { code: "PTS", ar: "بورسعيد", en: "Port Said" },
  { code: "ISM", ar: "الإسماعيلية", en: "Ismailia" },
  { code: "SUZ", ar: "السويس", en: "Suez" },
  { code: "FYM", ar: "الفيوم", en: "Faiyum" },
  { code: "BNS", ar: "بني سويف", en: "Beni Suef" },
  { code: "MNY", ar: "المنيا", en: "Minya" },
  { code: "AST", ar: "أسيوط", en: "Asyut" },
  { code: "SHG", ar: "سوهاج", en: "Sohag" },
  { code: "QNA", ar: "قنا", en: "Qena" },
  { code: "LUX", ar: "الأقصر", en: "Luxor" },
  { code: "ASN", ar: "أسوان", en: "Aswan" },
  { code: "BA", ar: "البحر الأحمر", en: "Red Sea" },
  { code: "WAD", ar: "الوادي الجديد", en: "New Valley" },
  { code: "MT", ar: "مطروح", en: "Matrouh" },
  { code: "SIN", ar: "شمال سيناء", en: "North Sinai" },
  { code: "JS", ar: "جنوب سيناء", en: "South Sinai" },
] as const;

export type GovernorateCode = (typeof GOVERNORATES)[number]["code"];

export const GOVERNORATE_CODES = GOVERNORATES.map((g) => g.code) as [GovernorateCode, ...GovernorateCode[]];

export function governorateName(code: string, locale: string): string {
  const g = GOVERNORATES.find((x) => x.code === code);
  return g ? (locale === "ar" ? g.ar : g.en) : code;
}
