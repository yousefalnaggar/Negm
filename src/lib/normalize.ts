// Pure helpers shared by the app and the seed script.

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

/** Converts Arabic-Indic and Persian digits to Western 0-9. */
export function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = ARABIC_INDIC.indexOf(d);
    return String(i >= 0 ? i : PERSIAN.indexOf(d));
  });
}

/** Strips spaces/dashes and a +20 / 0020 prefix; returns 11-digit local form. */
export function normalizePhone(input: string): string {
  let p = normalizeDigits(input).replace(/[\s\-()]/g, "");
  if (p.startsWith("+20")) p = "0" + p.slice(3);
  else if (p.startsWith("0020")) p = "0" + p.slice(4);
  return p;
}

export const EGYPT_MOBILE = /^01[0125]\d{8}$/;

/** Lowercase, drop Arabic diacritics/tatweel, unify alef/ya/ta-marbuta. */
export function normalizeSearch(input: string): string {
  return normalizeDigits(input)
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchText(p: { nameAr: string; nameEn: string }): string {
  return normalizeSearch(`${p.nameAr} ${p.nameEn}`);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** wa.me link for an Egyptian mobile number (01xxxxxxxxx → 201xxxxxxxxx). */
export function whatsappUrl(phone: string): string {
  const p = normalizePhone(phone).replace(/\D/g, "");
  return `https://wa.me/${p.startsWith("0") ? "20" + p.slice(1) : p}`;
}
